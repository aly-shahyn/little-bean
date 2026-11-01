import { createFileRoute } from "@tanstack/react-router";

import { json } from "../../../lib/admin.server";
import { bindings } from "../../../lib/bindings.server";
import { hashPassword, verifyPassword } from "../../../lib/crypto.server";
import { currentCustomer } from "../../../lib/customer.server";

export const Route = createFileRoute("/api/account/password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const me = await currentCustomer(request);
        if (!me) return json({ ok: false, error: "Please log in again." }, { status: 401 });
        const b = (await request.json().catch(() => ({}))) as { current?: string; next?: string };
        const next = String(b.next ?? "");
        if (next.length < 6) return json({ ok: false, error: "New password needs at least 6 characters." }, { status: 400 });
        const { DB } = bindings();
        const row = await DB!.prepare("SELECT pass_hash FROM customers WHERE id = ?").bind(me.id).first<{ pass_hash: string }>();
        if (!row || !(await verifyPassword(String(b.current ?? ""), row.pass_hash)))
          return json({ ok: false, error: "Your current password is not right." }, { status: 400 });
        await DB!.prepare("UPDATE customers SET pass_hash = ? WHERE id = ?").bind(await hashPassword(next), me.id).run();
        return json({ ok: true });
      },
    },
  },
});
