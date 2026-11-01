import { createFileRoute } from "@tanstack/react-router";

import { currentAdmin, isAdmin, isSuperAdmin, json } from "../../../lib/admin.server";
import { orderCode, pointsToUse, priceCart } from "../../../lib/order-build.server";
import { bindings } from "../../../lib/bindings.server";
import { approvedMessageForCustomer, confirmedMessageForCustomer, mvr, normalizePhone, placedMessageForCustomer, pointsRules, type PlacedOrder } from "../../../lib/catalog";
import { CONTENT_KEYS } from "../../../lib/content";
import { WAC_RECEIVE_SQL, landedUnitCost, money, round2, round4 } from "../../../lib/costing";
import { readSettings } from "../../../lib/shop.server";
import { randomToken, sha256 } from "../../../lib/crypto.server";
import { logNotify, notifyOwner, sendWhatsApp, waReady } from "../../../lib/whatsapp.server";
import { sendSms, smsReady } from "../../../lib/sms.server";
import { deliverResetLink, issueResetLink } from "../../../lib/reset.server";
import { tgApi, tgWebhookSecret } from "../../../lib/telegram.server";

const STATUSES = ["pending", "confirmed", "completed", "cancelled"];
const DELIVERY = ["preparing", "out_for_delivery", "delivered"];
const MOVE_REASONS = ["received", "adjust", "damaged", "returned"];
const SHOP_PAYMENTS = ["cash", "card", "bml"];
/** A typed cost replaces the average only if it differs from what the form showed (2 decimals). */
function costOverride(typed: unknown, current: number | null | undefined) {
  const cur = Number(current) || 0;
  if (typed === undefined || typed === null || String(typed).trim() === "") return cur;
  const next = money(typed);
  return next === round2(cur) ? cur : next;
}
const SETTING_KEYS = [
  "whatsapp", "viber", "bank_name", "bank_account_name", "bank_account_number", "delivery_fee", "delivery_note",
  "announcement", "instagram", "require_approval", "wa_phone_number_id", "wa_token", "wa_lang", "wa_tpl_placed",
  "wa_tpl_confirmed", "wa_tpl_account", "wa_tpl_admin", "callmebot_key", "owner_notify_phone",
  "points_per_mvr", "point_value", "points_min_redeem", "slip_check",
  "sms_provider", "sms_twilio_sid", "sms_twilio_token", "sms_twilio_from", "sms_twilio_service", "sms_http_url", "sms_http_method", "sms_http_headers", "sms_http_body", "sms_sender", "telegram_bot_token",
  ...CONTENT_KEYS.map((k) => `c.${k}`),
];

type OrderRow = { customer_id: number | null; points_used: number; points_discount: number; points_earned: number; points_refunded: number; stock_deducted: number; delivery_status: string; code: string; name: string; phone: string; island: string; address: string; notes: string; payment: string; items_json: string; subtotal: number; delivery: number; total: number; slip_key: string | null; status: string };

/** Product units in an order, with bundles expanded into their products. */
function units(items: PlacedOrder["items"]): { id: string; qty: number }[] {
  const out: { id: string; qty: number }[] = [];
  for (const it of items) {
    if (it.bundle_items?.length) for (const b of it.bundle_items) out.push({ id: b.id, qty: b.qty * it.qty });
    else out.push({ id: it.id, qty: it.qty });
  }
  return out;
}

function toPlaced(o: OrderRow): PlacedOrder {
  let items: PlacedOrder["items"] = [];
  try { items = JSON.parse(o.items_json); } catch { items = []; }
  return { ...o, items, slip: !!o.slip_key };
}

export const Route = createFileRoute("/api/admin/update")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isAdmin(request))) return json({ ok: false, error: "unauthorized" }, { status: 401 });
        const { DB } = bindings();
        if (!DB) return json({ ok: false, error: "No database." }, { status: 503 });
        const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const kind = String(b.kind ?? "");
        const settings = await readSettings();

        if (kind === "order_status" || kind === "order_notify") {
          const code = String(b.code ?? "");
          const o = await DB.prepare("SELECT * FROM orders WHERE code = ?").bind(code).first<OrderRow>();
          if (!o) return json({ ok: false, error: "Order not found." }, { status: 404 });
          let status = o.status;
          if (kind === "order_status") {
            status = String(b.status ?? "");
            if (!STATUSES.includes(status)) return json({ ok: false, error: "Bad status." }, { status: 400 });
            if (status === "completed" && o.delivery_status !== "delivered")
              return json({ ok: false, error: "Mark the delivery as Delivered first, then complete the order." }, { status: 400 });
            const placedItems = units(toPlaced(o).items);
            const stmts = [];
            let cogs = 0;
            // Confirming takes the items out of stock; cancelling a confirmed order puts them back.
            if (status === "confirmed" && !o.stock_deducted) {
              for (const it of placedItems) {
                const p = await DB.prepare("SELECT stock, cost_price FROM products WHERE id = ?").bind(it.id).first<{ stock: number | null; cost_price: number }>();
                // Sold at the current weighted average cost; selling never changes the average.
                const unitCost = round4(p?.cost_price ?? 0);
                cogs += unitCost * it.qty;
                if (p && p.stock !== null) {
                  stmts.push(DB.prepare("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?").bind(it.qty, it.id));
                  stmts.push(DB.prepare("INSERT INTO stock_moves (product_id, change, reason, note, order_code, unit_cost, avg_after) VALUES (?, ?, 'sale', ?, ?, ?, ?)").bind(it.id, -it.qty, `Order ${code}`, code, unitCost, unitCost));
                }
              }
              stmts.push(DB.prepare("UPDATE orders SET stock_deducted = 1, cogs = ? WHERE code = ?").bind(round2(cogs), code));
            }
            if (status === "cancelled" && o.stock_deducted) {
              for (const it of placedItems) {
                const p = await DB.prepare("SELECT stock FROM products WHERE id = ?").bind(it.id).first<{ stock: number | null }>();
                if (p && p.stock !== null) {
                  // Units go back at the cost they left at, so the average is restored, not diluted.
                  const sold = await DB.prepare("SELECT unit_cost FROM stock_moves WHERE order_code = ? AND product_id = ? AND reason = 'sale' ORDER BY id DESC LIMIT 1").bind(code, it.id).first<{ unit_cost: number }>();
                  const back = round4(sold?.unit_cost ?? 0);
                  if (back > 0) stmts.push(DB.prepare(WAC_RECEIVE_SQL).bind(it.qty, back, it.id));
                  else stmts.push(DB.prepare("UPDATE products SET stock = MAX(COALESCE(stock, 0), 0) + ? WHERE id = ?").bind(it.qty, it.id));
                  stmts.push(DB.prepare("INSERT INTO stock_moves (product_id, change, reason, note, order_code, unit_cost, avg_after) VALUES (?, ?, 'returned', ?, ?, ?, (SELECT cost_price FROM products WHERE id = ?))").bind(it.id, it.qty, `Order ${code} cancelled`, code, back, it.id));
                }
              }
              stmts.push(DB.prepare("UPDATE orders SET stock_deducted = 0 WHERE code = ?").bind(code));
            }
            const rules = pointsRules(settings);
            if (status === "completed" && o.customer_id && !o.points_earned) {
              const earned = rules.earnFor(o.subtotal - (o.points_discount || 0));
              if (earned > 0) {
                stmts.push(DB.prepare("INSERT INTO points_ledger (customer_id, change, reason, order_code, note) VALUES (?, ?, 'earn', ?, ?)").bind(o.customer_id, earned, code, `Earned on order ${code}`));
                stmts.push(DB.prepare("UPDATE orders SET points_earned = ? WHERE code = ?").bind(earned, code));
              }
            }
            if (status === "cancelled" && o.customer_id) {
              if (o.points_used && !o.points_refunded) {
                stmts.push(DB.prepare("INSERT INTO points_ledger (customer_id, change, reason, order_code, note) VALUES (?, ?, 'refund', ?, ?)").bind(o.customer_id, o.points_used, code, `Returned from cancelled order ${code}`));
                stmts.push(DB.prepare("UPDATE orders SET points_refunded = 1 WHERE code = ?").bind(code));
              }
              if (o.points_earned) {
                stmts.push(DB.prepare("INSERT INTO points_ledger (customer_id, change, reason, order_code, note) VALUES (?, ?, 'reverse', ?, ?)").bind(o.customer_id, -o.points_earned, code, `Removed, order ${code} cancelled`));
                stmts.push(DB.prepare("UPDATE orders SET points_earned = 0 WHERE code = ?").bind(code));
              }
            }
            if (status === "pending" && o.status === "cancelled" && o.customer_id && o.points_used && o.points_refunded) {
              stmts.push(DB.prepare("INSERT INTO points_ledger (customer_id, change, reason, order_code, note) VALUES (?, ?, 'redeem', ?, ?)").bind(o.customer_id, -o.points_used, code, `Used on order ${code}`));
              stmts.push(DB.prepare("UPDATE orders SET points_refunded = 0 WHERE code = ?").bind(code));
            }
            stmts.push(
              DB.prepare(
                `UPDATE orders SET status = ?${status === "confirmed" ? ", confirmed_at = COALESCE(confirmed_at, datetime('now'))" : ""}${status === "completed" ? ", completed_at = datetime('now')" : ""} WHERE code = ?`,
              ).bind(status, code),
            );
            await DB.batch(stmts);
            await logNotify(code, `Status set to ${status}`);
          }
          const placed = toPlaced({ ...o, status });
          const which = kind === "order_notify" ? String(b.which ?? "confirmed") : status === "confirmed" && o.status === "pending" ? "confirmed" : "";
          let notified: boolean | null = null;
          if (which && waReady(settings)) {
            const isConfirm = which === "confirmed";
            const r = await sendWhatsApp(settings, o.phone, {
              template: (isConfirm ? settings.wa_tpl_confirmed : settings.wa_tpl_placed) || undefined,
              params: [o.name.split(" ")[0], o.code, mvr(o.total)],
              text: isConfirm ? confirmedMessageForCustomer(placed, settings) : placedMessageForCustomer(placed),
            });
            notified = r.ok;
            await logNotify(code, r.ok ? `WhatsApp ${which} sent (${r.detail})` : `WhatsApp ${which} FAILED: ${r.detail}`);
          }
          return json({ ok: true, notified });
        }

        if (kind === "data_reset") {
          // Super Admin only: wipe test data before going live. Catalogue, content, settings and logins are kept.
          if (!(await isSuperAdmin(request))) return json({ ok: false, error: "Only the Super Admin can reset data." }, { status: 403 });
          if (String(b.confirm ?? "") !== "RESET") return json({ ok: false, error: "Type RESET to confirm." }, { status: 400 });
          const groups = Array.isArray(b.groups) ? (b.groups as unknown[]).map(String) : [];
          const count = async (t: string) => (await DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first<{ n: number }>())?.n ?? 0;
          const cleared: Record<string, number> = {};
          const stmts = [];
          if (groups.includes("orders")) {
            cleared.orders = await count("orders");
            // Remove uploaded transfer slips too.
            const { STORAGE } = bindings();
            if (STORAGE) {
              const keys = ((await DB.prepare("SELECT slip_key FROM orders WHERE slip_key IS NOT NULL AND slip_key != ''").all<{ slip_key: string }>()).results ?? []).map((r) => r.slip_key);
              for (let i = 0; i < keys.length; i += 500) await STORAGE.delete(keys.slice(i, i + 500)).catch(() => undefined);
            }
            stmts.push(DB.prepare("DELETE FROM orders"));
          }
          if (groups.includes("expenses")) { cleared.expenses = await count("expenses"); stmts.push(DB.prepare("DELETE FROM expenses")); }
          if (groups.includes("stock") || groups.includes("inventory")) { cleared["stock movements"] = await count("stock_moves"); stmts.push(DB.prepare("DELETE FROM stock_moves")); }
          if (groups.includes("inventory")) {
            // Fresh start: no stock tracking, no stock counts, no average cost (SKU, batch and expiry stay).
            cleared["tracked products"] = (await DB.prepare("SELECT COUNT(*) AS n FROM products WHERE stock IS NOT NULL OR cost_price != 0").first<{ n: number }>())?.n ?? 0;
            stmts.push(DB.prepare("UPDATE products SET stock = NULL, cost_price = 0"));
          }
          if (groups.includes("customers")) {
            cleared.customers = await count("customers");
            cleared["points entries"] = await count("points_ledger");
            stmts.push(DB.prepare("DELETE FROM points_ledger"), DB.prepare("DELETE FROM saved_products"), DB.prepare("DELETE FROM customer_sessions"), DB.prepare("DELETE FROM customers"));
          }
          if (!stmts.length) return json({ ok: false, error: "Choose what to clear." }, { status: 400 });
          await DB.batch(stmts);
          return json({ ok: true, cleared });
        }

        if (kind === "order_delete") {
          // Super Admin only, and only for completed orders.
          if (!(await isSuperAdmin(request))) return json({ ok: false, error: "Only the Super Admin can delete orders." }, { status: 403 });
          const code = String(b.code ?? "");
          const o = await DB.prepare("SELECT code, status, customer_id, points_used, points_earned, points_refunded FROM orders WHERE code = ?").bind(code).first<{ code: string; status: string; customer_id: number | null; points_used: number; points_earned: number; points_refunded: number }>();
          if (!o) return json({ ok: false, error: "Order not found." }, { status: 404 });
          if (o.status !== "completed") return json({ ok: false, error: "Only completed orders can be deleted." }, { status: 400 });
          const stmts = [DB.prepare("DELETE FROM orders WHERE code = ?").bind(code)];
          if (o.customer_id && o.points_earned)
            stmts.push(DB.prepare("INSERT INTO points_ledger (customer_id, change, reason, order_code, note) VALUES (?, ?, 'reverse', ?, ?)").bind(o.customer_id, -o.points_earned, code, `Removed, order ${code} deleted`));
          if (o.customer_id && o.points_used && !o.points_refunded)
            stmts.push(DB.prepare("INSERT INTO points_ledger (customer_id, change, reason, order_code, note) VALUES (?, ?, 'refund', ?, ?)").bind(o.customer_id, o.points_used, code, `Returned, order ${code} deleted`));
          await DB.batch(stmts);
          return json({ ok: true });
        }

        if (kind === "order_delivery") {
          const code = String(b.code ?? "");
          const d = String(b.delivery ?? "");
          if (!DELIVERY.includes(d)) return json({ ok: false, error: "Bad delivery status." }, { status: 400 });
          // Remember when each delivery step happened (moving back a step clears the later times).
          await DB.prepare(
            `UPDATE orders SET delivery_status = ?1,
              out_for_delivery_at = CASE WHEN ?1 = 'preparing' THEN NULL WHEN ?1 IN ('out_for_delivery', 'delivered') THEN COALESCE(out_for_delivery_at, datetime('now')) ELSE out_for_delivery_at END,
              delivered_at = CASE WHEN ?1 = 'delivered' THEN COALESCE(delivered_at, datetime('now')) ELSE NULL END
             WHERE code = ?2 AND status = 'confirmed'`,
          ).bind(d, code).run();
          await logNotify(code, `Delivery: ${d.replace(/_/g, " ")}`);
          return json({ ok: true });
        }

        if (kind === "order_create") {
          // A manual order from the admin (phone, Viber, walk-in). Same pricing, stock and points rules
          // as the website; it starts in To confirm and then follows the normal order journey.
          const me = await currentAdmin(request);
          const by = me?.name || me?.username || "Admin";
          const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
          type Cust = { id: number; name: string; phone: string; island: string; address: string; status: string };
          let cust: Cust | null = null;
          let createdCustomer = false;
          if (b.customer_id) {
            cust = await DB.prepare("SELECT id, name, phone, island, address, status FROM customers WHERE id = ?").bind(Number(b.customer_id)).first<Cust>();
            if (!cust) return json({ ok: false, error: "Customer not found." }, { status: 404 });
          } else {
            const nc = (b.new_customer ?? {}) as Record<string, unknown>;
            const name = str(nc.name, 80);
            const phone = normalizePhone(str(nc.phone, 30));
            if (phone.length < 10) return json({ ok: false, error: "Enter the customer's mobile number." }, { status: 400 });
            cust = await DB.prepare("SELECT id, name, phone, island, address, status FROM customers WHERE phone = ?").bind(phone).first<Cust>();
            if (!cust) {
              if (name.length < 2) return json({ ok: false, error: "Enter the customer's name." }, { status: 400 });
              const island = str(nc.island, 60);
              const address = str(nc.address, 300);
              // No password yet: the customer claims the account later with a secure link sent to this number.
              const res = await DB.prepare("INSERT INTO customers (name, phone, island, address, pass_hash, status, approved_at, created_by) VALUES (?, ?, ?, ?, '', 'approved', datetime('now'), ?)")
                .bind(name, phone, island, address, by).run();
              cust = { id: Number(res.meta.last_row_id), name, phone, island, address, status: "approved" };
              createdCustomer = true;
            }
          }
          if (cust.status === "blocked") return json({ ok: false, error: `${cust.name}'s account is blocked. Unblock it in Customers first.` }, { status: 400 });

          const pickup = b.fulfilment === "pickup";
          const island = pickup ? "" : str(b.island, 60) || cust.island;
          const address = pickup ? "Collected from the shop" : str(b.address, 300) || cust.address;
          if (address.length < 3) return json({ ok: false, error: "Add the delivery address." }, { status: 400 });
          const payment = str(b.payment, 20);
          if (!SHOP_PAYMENTS.includes(payment)) return json({ ok: false, error: "Choose how the customer is paying." }, { status: 400 });
          const cart = await priceCart(b.items);
          if (cart.error) return json({ ok: false, error: cart.error }, { status: 400 });
          if (cart.unavailable.length) return json({ ok: false, error: `Not available right now: ${cart.unavailable.join(", ")}. Remove it to continue.` }, { status: 400 });
          if (!cart.items.length) return json({ ok: false, error: "Add at least one product." }, { status: 400 });
          const delivery = pickup ? 0 : b.delivery === undefined || b.delivery === "" ? Math.max(0, Math.floor(Number(settings.delivery_fee) || 0)) : Math.max(0, Math.floor(Number(b.delivery) || 0));
          const pts = b.use_points ? await pointsToUse(DB, settings, cust.id, cart.subtotal) : { used: 0, discount: 0 };
          const total = cart.subtotal - pts.discount + delivery;
          const code = orderCode();
          const notes = str(b.notes, 500);
          const stmts = [
            DB.prepare("INSERT INTO orders (code, name, phone, island, address, notes, payment, items_json, subtotal, delivery, total, slip_key, status, customer_id, points_used, points_discount, source, created_by, notify_log) VALUES (?,?,?,?,?,?,?,?,?,?,?, NULL, 'pending', ?, ?, ?, 'shop', ?, ?)")
              .bind(code, cust.name, cust.phone, island, address, notes, payment, JSON.stringify(cart.items), cart.subtotal, delivery, total, cust.id, pts.used, pts.discount, by, `${new Date().toISOString().slice(0, 16).replace("T", " ")} Added by ${by} (shop order)\n`),
          ];
          if (pts.used > 0) stmts.push(DB.prepare("INSERT INTO points_ledger (customer_id, change, reason, order_code, note) VALUES (?, ?, 'redeem', ?, ?)").bind(cust.id, -pts.used, code, `Used on order ${code}`));
          // Fill in a missing address on the customer's profile, never overwrite one they set.
          if (!pickup) stmts.push(DB.prepare("UPDATE customers SET address = CASE WHEN address = '' THEN ? ELSE address END, island = CASE WHEN island = '' THEN ? ELSE island END WHERE id = ?").bind(address, island, cust.id));
          await DB.batch(stmts);
          return json({ ok: true, code, total, customer_id: cust.id, created_customer: createdCustomer, points_used: pts.used, points_discount: pts.discount });
        }

        if (kind === "inventory_save") {
          const id = String(b.id ?? "");
          const track = !!b.track;
          const stock = track ? Math.max(0, Math.floor(Number(b.stock) || 0)) : null;
          const prev = await DB.prepare("SELECT stock, cost_price FROM products WHERE id = ?").bind(id).first<{ stock: number | null; cost_price: number }>();
          if (!prev) return json({ ok: false, error: "Product not found." }, { status: 404 });
          const stmts = [
            DB.prepare("UPDATE products SET sku = ?, cost_price = ?, low_stock = ?, stock = ?, batch_no = ?, expiry = ? WHERE id = ?").bind(
              String(b.sku ?? "").slice(0, 60), costOverride(b.cost_price, prev.cost_price), Math.max(0, Math.floor(Number(b.low_stock) || 0)), stock,
              String(b.batch_no ?? "").trim().slice(0, 40), /^\d{4}-\d{2}(-\d{2})?$/.test(String(b.expiry ?? "")) ? String(b.expiry) : "", id,
            ),
          ];
          if (stock !== null && (prev.stock ?? 0) !== stock)
            stmts.push(DB.prepare("INSERT INTO stock_moves (product_id, change, reason, note) VALUES (?, ?, 'adjust', 'Stock count set')").bind(id, stock - (prev.stock ?? 0)));
          await DB.batch(stmts);
          return json({ ok: true });
        }

        if (kind === "stock_move") {
          const id = String(b.id ?? "");
          const reason = String(b.reason ?? "");
          if (!MOVE_REASONS.includes(reason)) return json({ ok: false, error: "Bad reason." }, { status: 400 });
          const qty = Math.floor(Number(b.qty) || 0);
          if (!qty) return json({ ok: false, error: "Enter a quantity." }, { status: 400 });
          const change = reason === "damaged" ? -Math.abs(qty) : reason === "adjust" ? qty : Math.abs(qty);
          const p = await DB.prepare("SELECT name, stock FROM products WHERE id = ?").bind(id).first<{ name: string; stock: number | null }>();
          if (!p) return json({ ok: false, error: "Product not found." }, { status: 404 });
          const note = String(b.note ?? "").slice(0, 200);
          if (reason === "received") {
            // Weighted average cost: landed cost = product cost + this shipment's logistics per unit.
            const unitCost = money(b.unit_cost);
            const logistics = money(b.logistics);
            const landed = landedUnitCost(unitCost, logistics, change);
            const stmts = [
              DB.prepare(WAC_RECEIVE_SQL).bind(change, landed, id),
              DB.prepare("INSERT INTO stock_moves (product_id, change, reason, note, unit_cost, logistics, avg_after) VALUES (?, ?, 'received', ?, ?, ?, (SELECT cost_price FROM products WHERE id = ?))").bind(id, change, note, landed, logistics, id),
            ];
            const spent = round2(change * unitCost + logistics);
            if (b.add_expense && spent > 0)
              stmts.push(DB.prepare("INSERT INTO expenses (spent_on, category, description, amount) VALUES (date('now'), 'Stock purchase', ?, ?)").bind(`${change} x ${p.name}${logistics ? ` (incl. MVR ${logistics} logistics)` : ""}`, spent));
            await DB.batch(stmts);
            const after = await DB.prepare("SELECT cost_price FROM products WHERE id = ?").bind(id).first<{ cost_price: number }>();
            return json({ ok: true, landed, avg: after?.cost_price ?? 0 });
          }
          // Damaged, returned and corrections change units only; the average cost stays the same.
          await DB.batch([
            DB.prepare("UPDATE products SET stock = MAX(0, COALESCE(stock, 0) + ?) WHERE id = ?").bind(change, id),
            DB.prepare("INSERT INTO stock_moves (product_id, change, reason, note, avg_after) VALUES (?, ?, ?, ?, (SELECT cost_price FROM products WHERE id = ?))").bind(id, change, reason, note, id),
          ]);
          return json({ ok: true });
        }

        if (kind === "expense_save") {
          const amount = money(b.amount);
          const spentOn = /^\d{4}-\d{2}-\d{2}$/.test(String(b.spent_on ?? "")) ? String(b.spent_on) : new Date().toISOString().slice(0, 10);
          const category = String(b.category ?? "Other").slice(0, 40) || "Other";
          const desc = String(b.description ?? "").slice(0, 200);
          if (!amount) return json({ ok: false, error: "Enter an amount." }, { status: 400 });
          if (b.id) await DB.prepare("UPDATE expenses SET spent_on = ?, category = ?, description = ?, amount = ? WHERE id = ?").bind(spentOn, category, desc, amount, Number(b.id)).run();
          else await DB.prepare("INSERT INTO expenses (spent_on, category, description, amount) VALUES (?,?,?,?)").bind(spentOn, category, desc, amount).run();
          return json({ ok: true });
        }

        if (kind === "bundle_save") {
          const name = String(b.name ?? "").trim().slice(0, 80);
          const price = Math.max(0, Math.floor(Number(b.price) || 0));
          const items = Array.isArray(b.items) ? (b.items as { id?: unknown; qty?: unknown }[]).filter((x) => typeof x?.id === "string").slice(0, 12).map((x) => ({ id: String(x.id), qty: Math.max(1, Math.min(20, Math.floor(Number(x.qty) || 1))) })) : [];
          if (!name) return json({ ok: false, error: "Give the bundle a name." }, { status: 400 });
          if (items.length < 2 && !(items.length === 1 && items[0].qty > 1)) return json({ ok: false, error: "Add at least two products (or one product x2+)." }, { status: 400 });
          if (!price) return json({ ok: false, error: "Set the bundle price." }, { status: 400 });
          const id = String(b.id || "").trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || `bundle-${Date.now()}`;
          await DB.prepare(
            "INSERT INTO bundles (id, name, blurb, image, items_json, price, kind, age, active, sort) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, blurb = excluded.blurb, image = excluded.image, items_json = excluded.items_json, price = excluded.price, kind = excluded.kind, age = excluded.age, active = excluded.active, sort = excluded.sort",
          ).bind(id, name, String(b.blurb ?? "").slice(0, 300), String(b.image ?? "").slice(0, 400), JSON.stringify(items), price, b.bundle_kind === "saver" ? "saver" : "bundle", String(b.age ?? "").slice(0, 10), b.active === false ? 0 : 1, Math.floor(Number(b.sort) || 0)).run();
          return json({ ok: true, id });
        }

        if (kind === "bundle_delete") {
          await DB.prepare("DELETE FROM bundles WHERE id = ?").bind(String(b.id ?? "")).run();
          return json({ ok: true });
        }

        if (kind === "points_adjust") {
          const cid = Math.floor(Number(b.customer_id) || 0);
          const change = Math.floor(Number(b.change) || 0);
          if (!cid || !change) return json({ ok: false, error: "Enter the points to add or remove." }, { status: 400 });
          await DB.prepare("INSERT INTO points_ledger (customer_id, change, reason, note) VALUES (?, ?, 'adjust', ?)").bind(cid, change, String(b.note ?? "Adjusted by the shop").slice(0, 120)).run();
          return json({ ok: true });
        }

        if (kind === "expense_delete") {
          await DB.prepare("DELETE FROM expenses WHERE id = ?").bind(Number(b.id)).run();
          return json({ ok: true });
        }

        if (kind === "order_note") {
          await DB.prepare("UPDATE orders SET admin_note = ? WHERE code = ?").bind(String(b.note ?? "").slice(0, 1000), String(b.code ?? "")).run();
          return json({ ok: true });
        }

        if (kind === "customer_reset") {
          const id = Number(b.id);
          const c = await DB.prepare("SELECT id, name, phone, telegram_chat_id, pass_hash FROM customers WHERE id = ?").bind(id).first<{ id: number; name: string; phone: string; telegram_chat_id: string | null; pass_hash: string }>();
          if (!c) return json({ ok: false, error: "Customer not found." }, { status: 404 });
          const link = await issueResetLink(DB, c, new URL(request.url).origin, 24 * 60);
          const message = c.pass_hash === ""
            ? `Hi ${c.name.split(" ")[0]}, your Little Bean account is ready with your orders. Set your password here (valid for 24 hours):\n${link}`
            : `Hi ${c.name.split(" ")[0]}, here is your Little Bean password reset link (valid for 24 hours):\n${link}`;
          const channel = await deliverResetLink(DB, settings, c, link, 24 * 60);
          if (!channel) await DB.prepare("UPDATE customers SET reset_channel = 'manual', reset_requested_at = NULL WHERE id = ?").bind(id).run();
          return json({ ok: true, link, message, phone: c.phone, notified: channel ? true : null, channel });
        }

        if (kind === "customer") {
          const id = Number(b.id);
          const action = String(b.action ?? "");
          const c = await DB.prepare("SELECT id, name, phone FROM customers WHERE id = ?").bind(id).first<{ id: number; name: string; phone: string }>();
          if (!c) return json({ ok: false, error: "Customer not found." }, { status: 404 });
          if (action === "delete") {
            await DB.batch([
              DB.prepare("DELETE FROM customer_sessions WHERE customer_id = ?").bind(id),
              DB.prepare("DELETE FROM customers WHERE id = ?").bind(id),
            ]);
            return json({ ok: true });
          }
          if (!["approved", "blocked", "pending"].includes(action)) return json({ ok: false, error: "Bad action." }, { status: 400 });
          await DB.prepare(`UPDATE customers SET status = ?${action === "approved" ? ", approved_at = datetime('now')" : ""} WHERE id = ?`).bind(action, id).run();
          if (action === "blocked") await DB.prepare("DELETE FROM customer_sessions WHERE customer_id = ?").bind(id).run();
          let notified: boolean | null = null;
          let detail = "";
          if (action === "approved" && waReady(settings)) {
            const r = await sendWhatsApp(settings, c.phone, {
              template: settings.wa_tpl_account || undefined,
              params: [c.name.split(" ")[0]],
              text: approvedMessageForCustomer(c.name),
            });
            notified = r.ok;
            detail = r.detail;
          }
          return json({ ok: true, notified, detail });
        }

        if (kind === "settings") {
          const values = (b.values ?? {}) as Record<string, unknown>;
          const stmt = DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
          const batch = [];
          for (const [k, v] of Object.entries(values)) {
            if (!SETTING_KEYS.includes(k)) continue;
            const val = String(v ?? "").trim().slice(0, 4000);
            if ((k === "wa_token" || k === "callmebot_key" || k === "sms_twilio_token" || k === "sms_http_headers" || k === "telegram_bot_token") && val === "") continue; // keep existing secret
            batch.push(stmt.bind(k, val === "__clear__" ? "" : val));
          }
          if (batch.length) await DB.batch(batch);
          return json({ ok: true, saved: batch.length });
        }

        if (kind === "owner_test") {
          const r = await notifyOwner(settings, "Test alert from your Little Bean website. New orders will arrive like this.");
          return json({ ok: r.ok, error: r.ok ? undefined : r.detail });
        }

        if (kind === "telegram_connect") {
          if (!settings.telegram_bot_token) return json({ ok: false, error: "Paste the bot token and save first." }, { status: 400 });
          const me = await tgApi(settings, "getMe");
          if (!me.ok) return json({ ok: false, error: `Telegram says: ${me.detail}. Check the bot token.` }, { status: 400 });
          const username = String((me.result as { username?: string })?.username ?? "");
          const url = `${new URL(request.url).origin}/api/telegram/webhook`;
          const hook = await tgApi(settings, "setWebhook", { url, secret_token: await tgWebhookSecret(settings), allowed_updates: ["message"], drop_pending_updates: true });
          if (!hook.ok) return json({ ok: false, error: `Could not connect the webhook: ${hook.detail}` }, { status: 400 });
          await tgApi(settings, "setMyCommands", { commands: [{ command: "reset", description: "Get a password reset link" }, { command: "start", description: "Connect your Little Bean account" }] });
          await tgApi(settings, "setMyShortDescription", { short_description: "Little Bean: password reset links for your account." });
          await DB.prepare("INSERT INTO settings (key, value) VALUES ('telegram_bot_username', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(username).run();
          return json({ ok: true, username, detail: url });
        }

        if (kind === "telegram_status") {
          const info = await tgApi(settings, "getWebhookInfo");
          const r = (info.result ?? {}) as { url?: string; last_error_message?: string; pending_update_count?: number };
          const linked = (await DB.prepare("SELECT COUNT(*) AS n FROM customers WHERE telegram_chat_id IS NOT NULL").first<{ n: number }>())?.n ?? 0;
          return json({ ok: info.ok, error: info.ok ? undefined : info.detail, detail: r.url ? `Webhook ${r.url}${r.last_error_message ? `, last error: ${r.last_error_message}` : ""}. ${linked} customer(s) connected.` : "Webhook not set" });
        }

        if (kind === "sms_test") {
          if (!smsReady(settings)) return json({ ok: false, error: "Save the SMS settings first." }, { status: 400 });
          const to = String(b.phone ?? "");
          const r = await sendSms(settings, to, "Little Bean: this is a test SMS. Password reset links will arrive like this.");
          return json({ ok: r.ok, error: r.ok ? undefined : r.detail, detail: r.detail });
        }

        if (kind === "wa_test") {
          const tpl = String(b.template ?? "");
          const r = await sendWhatsApp(tpl === "hello_world" ? { ...settings, wa_lang: "en_US" } : settings, String(b.phone ?? ""), {
            template: String(b.template ?? "") || undefined,
            text: "Test message from your Little Bean website. WhatsApp is connected!",
          });
          return json({ ok: r.ok, error: r.ok ? undefined : r.detail });
        }

        return json({ ok: false, error: "Unknown update." }, { status: 400 });
      },
    },
  },
});
