import { createFileRoute } from "@tanstack/react-router";

import { json } from "../../../lib/admin.server";
import { bindings } from "../../../lib/bindings.server";
import { hashPassword, sha256 } from "../../../lib/crypto.server";
import { createSession } from "../../../lib/customer.server";

export const Route = createFileRoute("/api/account/reset")({
  server: {
    handlers: {
      // The reset page checks the link first, so an old link says so before the customer types.
      GET: async ({ request }) => {
        const { DB } = bindings();
        const token = new URL(request.url).searchParams.get("token") ?? "";
        if (!DB || token.length < 20) return json({ ok: true, valid: false });
        const c = await DB.prepare("SELECT name FROM customers WHERE reset_hash = ? AND reset_expires > datetime('now')").bind(await sha256(token)).first<{ name: string }>();
        return json({ ok: true, valid: !!c, name: c ? c.name.split(" ")[0] : "" });
      },
      POST: async ({ request }) => {
        const { DB } = bindings();
        if (!DB) return json({ ok: false, error: "Not available right now." }, { status: 503 });
        const b = (await request.json().catch(() => ({}))) as { token?: string; password?: string };
        const token = String(b.token ?? "");
        const password = String(b.password ?? "");
        if (password.length < 6) return json({ ok: false, error: "Password needs at least 6 characters." }, { status: 400 });
        if (token.length < 20) return json({ ok: false, error: "This reset link is not valid." }, { status: 400 });
        const c = await DB.prepare("SELECT id FROM customers WHERE reset_hash = ? AND reset_expires > datetime('now')").bind(await sha256(token)).first<{ id: number }>();
        if (!c) return json({ ok: false, error: "This reset link has expired or was already used. Please ask for a new one." }, { status: 400 });
        await DB.batch([
          DB.prepare("UPDATE customers SET pass_hash = ?, reset_hash = NULL, reset_expires = NULL, reset_requested_at = NULL, reset_channel = 'done' WHERE id = ?").bind(await hashPassword(password), c.id),
          DB.prepare("DELETE FROM customer_sessions WHERE customer_id = ?").bind(c.id),
        ]);
        return json({ ok: true }, { headers: { "set-cookie": await createSession(c.id) } });
      },
    },
  },
});
