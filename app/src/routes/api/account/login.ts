import { createFileRoute } from "@tanstack/react-router";

import { json } from "../../../lib/admin.server";
import { bindings } from "../../../lib/bindings.server";
import { normalizePhone } from "../../../lib/catalog";
import { verifyPassword } from "../../../lib/crypto.server";
import { createSession, destroySession } from "../../../lib/customer.server";

export const Route = createFileRoute("/api/account/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { DB } = bindings();
        if (!DB) return json({ ok: false, error: "Accounts are not available right now." }, { status: 503 });
        const b = (await request.json().catch(() => ({}))) as { phone?: string; password?: string; logout?: boolean };
        if (b.logout) return json({ ok: true }, { headers: { "set-cookie": await destroySession(request) } });
        const phone = normalizePhone(String(b.phone ?? ""));
        const row = await DB.prepare("SELECT id, pass_hash, status FROM customers WHERE phone = ?").bind(phone).first<{ id: number; pass_hash: string; status: string }>();
        if (row && row.pass_hash === "" && row.status !== "blocked")
          return json({ ok: false, code: "claim", error: "Your account was set up by our shop, so it has no password yet. We'll send you a link to set one." }, { status: 401 });
        if (!row || !(await verifyPassword(String(b.password ?? ""), row.pass_hash)))
          return json({ ok: false, error: "Phone number or password is not right." }, { status: 401 });
        if (row.status === "blocked") return json({ ok: false, error: "This account is not active. Please contact us." }, { status: 403 });
        await DB.prepare("UPDATE customers SET last_login = datetime('now') WHERE id = ?").bind(row.id).run();
        return json({ ok: true, status: row.status }, { headers: { "set-cookie": await createSession(row.id) } });
      },
    },
  },
});
