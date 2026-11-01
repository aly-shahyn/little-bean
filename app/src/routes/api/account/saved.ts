import { createFileRoute } from "@tanstack/react-router";

import { json } from "../../../lib/admin.server";
import { bindings } from "../../../lib/bindings.server";
import { currentCustomer } from "../../../lib/customer.server";

export const Route = createFileRoute("/api/account/saved")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const me = await currentCustomer(request);
        if (!me) return json({ ok: false, error: "login" }, { status: 401 });
        const b = (await request.json().catch(() => ({}))) as { product_id?: string; saved?: boolean };
        const id = String(b.product_id ?? "").slice(0, 120);
        if (!id) return json({ ok: false, error: "Missing product." }, { status: 400 });
        const { DB } = bindings();
        if (b.saved) await DB!.prepare("INSERT OR IGNORE INTO saved_products (customer_id, product_id) VALUES (?, ?)").bind(me.id, id).run();
        else await DB!.prepare("DELETE FROM saved_products WHERE customer_id = ? AND product_id = ?").bind(me.id, id).run();
        return json({ ok: true });
      },
    },
  },
});
