import { createFileRoute } from "@tanstack/react-router";

import { bindings } from "../../lib/bindings.server";
import { json } from "../../lib/admin.server";
import { mvr, paymentLabel, placedMessageForCustomer, type PlacedOrder } from "../../lib/catalog";
import { currentCustomer } from "../../lib/customer.server";
import { orderCode, pointsToUse, priceCart } from "../../lib/order-build.server";
import { readSettings } from "../../lib/shop.server";
import { logNotify, notifyOwner, ownerAlertsReady, sendWhatsApp, waReady } from "../../lib/whatsapp.server";

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);
const PAYMENTS = ["bml"]; // Website orders are paid by BML bank transfer (WhatsApp/Viber ordering removed).
const SLIP_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const Route = createFileRoute("/api/orders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { DB, STORAGE } = bindings();
        if (!DB) return json({ ok: false, error: "Ordering is not available right now." }, { status: 503 });
        const customer = await currentCustomer(request);
        if (!customer) return json({ ok: false, error: "Please log in to place an order.", code: "login" }, { status: 401 });
        if (customer.status !== "approved")
          return json({ ok: false, error: "Your account is waiting for approval. We'll let you know on WhatsApp once it's ready.", code: "pending" }, { status: 403 });

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return json({ ok: false, error: "Invalid request." }, { status: 400 });
        }
        const island = clean(form.get("island"), 60) || customer.island;
        const address = clean(form.get("address"), 300) || customer.address;
        const notes = clean(form.get("notes"), 500);
        const payment = clean(form.get("payment"), 20);
        if (address.length < 3) return json({ ok: false, error: "Please add your delivery address." }, { status: 400 });
        if (!PAYMENTS.includes(payment)) return json({ ok: false, error: "Online orders are paid by BML bank transfer. Please refresh the page and try again." }, { status: 400 });

        let raw: unknown;
        try {
          raw = JSON.parse(clean(form.get("items"), 5000) || "[]");
        } catch {
          raw = [];
        }
        const cart = await priceCart(raw);
        if (cart.error) return json({ ok: false, error: cart.error }, { status: 400 });
        const items = cart.items;
        if (!items.length) return json({ ok: false, error: "Your basket is empty." }, { status: 400 });

        const settings = await readSettings();
        const subtotal = cart.subtotal;
        const delivery = Math.max(0, Math.floor(Number(settings.delivery_fee) || 0));
        const pts = clean(form.get("use_points"), 2) === "1" ? await pointsToUse(DB, settings, customer.id, subtotal) : { used: 0, discount: 0 };
        const pointsUsed = pts.used;
        const pointsDiscount = pts.discount;
        const total = subtotal - pointsDiscount + delivery;
        const code = orderCode();

        // The transfer slip is required. With the slip check on (default), the browser has read the slip
        // and the bank, amount and reference it found must agree with this order.
        let slipKey: string | null = null;
        const slip = form.get("slip");
        if (!(slip instanceof File) || slip.size === 0) return json({ ok: false, error: "Please upload your bank transfer slip to place the order." }, { status: 400 });
        if (slip.size > 8 * 1024 * 1024) return json({ ok: false, error: "Transfer slip is too large (max 8 MB)." }, { status: 400 });
        if (!SLIP_TYPES.includes(slip.type)) return json({ ok: false, error: "The slip must be a screenshot (PNG or JPG)." }, { status: 400 });
        const checkOn = settings.slip_check !== "0";
        let slipBank = "";
        let slipRef = "";
        let slipAmount: number | null = null;
        let slipDate = "";
        if (checkOn) {
          slipBank = clean(form.get("slip_bank"), 5);
          slipRef = clean(form.get("slip_ref"), 40).toUpperCase();
          slipAmount = Number(clean(form.get("slip_amount"), 20));
          slipDate = clean(form.get("slip_date"), 20);
          if (!["BML", "MIB"].includes(slipBank)) return json({ ok: false, error: "Please upload a BML or MIB transfer slip." }, { status: 400 });
          if (!Number.isFinite(slipAmount) || Math.abs(slipAmount - total) > 0.005)
            return json({ ok: false, error: `The amount on your slip doesn't match your order total of ${mvr(total)}. Please check and upload the right slip.` }, { status: 400 });
          if (slipRef.length < 6) return json({ ok: false, error: "We couldn't read the reference on your slip. Please upload a clear, full screenshot." }, { status: 400 });
          const used = await DB.prepare("SELECT 1 AS x FROM orders WHERE slip_ref = ? AND status != 'cancelled' LIMIT 1").bind(slipRef).first();
          if (used) return json({ ok: false, error: "This transfer slip has already been used for another order. Please upload the slip for this payment." }, { status: 400 });
        }
        {
          if (STORAGE) {
            const ext = slip.type === "application/pdf" ? "pdf" : slip.type.split("/")[1];
            slipKey = `slips/${code}-${crypto.randomUUID()}.${ext}`;
            await STORAGE.put(slipKey, await slip.arrayBuffer(), { httpMetadata: { contentType: slip.type } });
          }
        }

        await DB.prepare(
          "INSERT INTO orders (code, name, phone, island, address, notes, payment, items_json, subtotal, delivery, total, slip_key, status, customer_id, points_used, points_discount, slip_bank, slip_ref, slip_amount, slip_date, slip_checked) VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)",
        )
          .bind(code, customer.name, customer.phone, island, address, notes, payment, JSON.stringify(items), subtotal, delivery, total, slipKey, customer.id, pointsUsed, pointsDiscount, slipBank, slipRef, slipAmount, slipDate, checkOn ? 1 : 0)
          .run();
        if (pointsUsed > 0)
          await DB.prepare("INSERT INTO points_ledger (customer_id, change, reason, order_code, note) VALUES (?, ?, 'redeem', ?, ?)").bind(customer.id, -pointsUsed, code, `Used on order ${code}`).run();

        const order: PlacedOrder = { code, name: customer.name, phone: customer.phone, island, address, notes, payment, items, subtotal, delivery, total, slip: !!slipKey, status: "pending", points_used: pointsUsed, points_discount: pointsDiscount };

        let notified = false;
        if (waReady(settings)) {
          const r = await sendWhatsApp(settings, customer.phone, {
            template: settings.wa_tpl_placed || undefined,
            params: [customer.name.split(" ")[0], code, mvr(total)],
            text: placedMessageForCustomer(order),
          });
          notified = r.ok;
          await logNotify(code, r.ok ? `WhatsApp order received sent (${r.detail})` : `WhatsApp order received FAILED: ${r.detail}`);
        }

        if (ownerAlertsReady(settings)) {
          const alert = [
            `New order ${code} waiting for approval`,
            `${customer.name} (+${customer.phone})`,
            ...items.map((i) => `${i.qty} x ${i.name}`),
            `Total ${mvr(total)} via ${paymentLabel(payment)}${slipKey ? " (slip attached)" : ""}`,
            `${address}${island ? `, ${island}` : ""}`,
          ].join("\n");
          const r = await notifyOwner(settings, alert);
          await logNotify(code, r.ok ? `Shop alert sent (${r.detail})` : `Shop alert FAILED: ${r.detail}`);
        }

        return json({ ok: true, order, notified });
      },
    },
  },
});
