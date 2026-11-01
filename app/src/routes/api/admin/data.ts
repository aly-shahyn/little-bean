import { createFileRoute } from "@tanstack/react-router";

import { adminConfigured, currentAdmin, json, listAdminUsers } from "../../../lib/admin.server";
import { bindings } from "../../../lib/bindings.server";
import { listBrands, listBundles, listCategories, listProducts, readSettings } from "../../../lib/shop.server";

export const Route = createFileRoute("/api/admin/data")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await adminConfigured())) return json({ ok: false, error: "not_configured" }, { status: 503 });
        const me = await currentAdmin(request);
        if (!me) return json({ ok: false, error: "unauthorized" }, { status: 401 });
        const { DB } = bindings();
        const orders = DB ? ((await DB.prepare("SELECT * FROM orders ORDER BY id DESC LIMIT 500").all()).results ?? []) : [];
        const customers = DB
          ? ((await DB.prepare(
              "SELECT c.id, c.name, c.phone, c.email, c.island, c.address, c.status, c.created_at, c.approved_at, c.last_login, c.reset_requested_at, c.reset_sent_at, c.reset_channel, CASE WHEN c.telegram_chat_id IS NOT NULL THEN 1 ELSE 0 END AS telegram, c.avatar, c.created_by, CASE WHEN c.pass_hash = '' THEN 0 ELSE 1 END AS has_login, (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS order_count, (SELECT COALESCE(SUM(change), 0) FROM points_ledger pl WHERE pl.customer_id = c.id) AS points FROM customers c ORDER BY CASE WHEN c.status = 'pending' THEN 0 WHEN c.reset_requested_at IS NOT NULL THEN 1 ELSE 2 END, c.id DESC",
            ).all()).results ?? [])
          : [];
        const raw = await readSettings();
        const settings: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw)) if (k !== "admin_hash" && k !== "admin2_hash" && k !== "wa_token" && k !== "callmebot_key" && k !== "sms_twilio_token" && k !== "sms_http_headers" && k !== "telegram_bot_token") settings[k] = v;
        settings.wa_token_set = raw.wa_token ? "1" : "0";
        settings.callmebot_set = raw.callmebot_key ? "1" : "0";
        settings.sms_twilio_token_set = raw.sms_twilio_token ? "1" : "0";
        settings.sms_http_headers_set = raw.sms_http_headers ? "1" : "0";
        settings.telegram_token_set = raw.telegram_bot_token ? "1" : "0";
        const [products, brands, categories, bundles] = await Promise.all([listProducts(true), listBrands(true), listCategories(true), listBundles(true)]);
        const expenses = DB ? ((await DB.prepare("SELECT * FROM expenses ORDER BY spent_on DESC, id DESC LIMIT 1000").all()).results ?? []) : [];
        const moves = DB
          ? ((await DB.prepare("SELECT m.*, p.name AS product_name FROM stock_moves m LEFT JOIN products p ON p.id = m.product_id ORDER BY m.id DESC LIMIT 150").all()).results ?? [])
          : [];
        const role = me.role;
        const users = role === "super" ? await listAdminUsers() : [];
        return json({ ok: true, role, me, users, orders, customers, products, brands, categories, settings, expenses, moves, bundles });
      },
    },
  },
});
