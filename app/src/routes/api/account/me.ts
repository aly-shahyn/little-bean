import { createFileRoute } from "@tanstack/react-router";

import { json } from "../../../lib/admin.server";
import { bindings } from "../../../lib/bindings.server";
import { currentCustomer } from "../../../lib/customer.server";

export const Route = createFileRoute("/api/account/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const customer = await currentCustomer(request);
        if (!customer) return json({ ok: true, customer: null, orders: [], saved: [], points: 0, ledger: [] });
        const { DB } = bindings();
        const orders = DB
          ? ((await DB.prepare("SELECT code, items_json, subtotal, delivery, total, status, delivery_status, payment, created_at, confirmed_at, completed_at, out_for_delivery_at, delivered_at, points_used, points_discount, points_earned FROM orders WHERE customer_id = ? ORDER BY id DESC LIMIT 50").bind(customer.id).all()).results ?? [])
          : [];
        const saved = DB
          ? ((await DB.prepare("SELECT product_id FROM saved_products WHERE customer_id = ? ORDER BY created_at DESC").bind(customer.id).all<{ product_id: string }>()).results ?? []).map((r) => r.product_id)
          : [];
        const ledger = DB
          ? ((await DB.prepare("SELECT change, reason, order_code, note, created_at FROM points_ledger WHERE customer_id = ? ORDER BY id DESC LIMIT 30").bind(customer.id).all()).results ?? [])
          : [];
        const points = DB ? ((await DB.prepare("SELECT COALESCE(SUM(change), 0) AS b FROM points_ledger WHERE customer_id = ?").bind(customer.id).first<{ b: number }>())?.b ?? 0) : 0;
        return json({ ok: true, customer, orders, saved, points, ledger });
      },
      POST: async ({ request }) => {
        const customer = await currentCustomer(request);
        if (!customer) return json({ ok: false, error: "Please log in." }, { status: 401 });
        const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const s = (k: string, max: number) => String(b[k] ?? "").trim().slice(0, max);
        const name = s("name", 80) || customer.name;
        const rawBirth = s("baby_birth", 10);
        const birth = /^\d{4}-\d{2}(-\d{2})?$/.test(rawBirth) ? rawBirth : "";
        const gender = ["boy", "girl"].includes(s("baby_gender", 4)) ? s("baby_gender", 4) : "";
        const has = (k: string) => Object.prototype.hasOwnProperty.call(b, k);
        await bindings().DB!.prepare("UPDATE customers SET name = ?, email = ?, island = ?, address = ?, baby_name = ?, baby_birth = ?, baby_gender = ? WHERE id = ?")
          .bind(
            name,
            has("email") ? s("email", 120) : customer.email,
            has("island") ? s("island", 60) : customer.island,
            has("address") ? s("address", 300) : customer.address,
            has("baby_name") ? s("baby_name", 40) : (customer.baby_name ?? ""),
            has("baby_birth") ? birth : (customer.baby_birth ?? ""),
            has("baby_gender") ? gender : (customer.baby_gender ?? ""),
            customer.id,
          ).run();
        return json({ ok: true });
      },
    },
  },
});
