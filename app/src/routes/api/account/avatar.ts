import { createFileRoute } from "@tanstack/react-router";

import { json } from "../../../lib/admin.server";
import { bindings } from "../../../lib/bindings.server";
import { currentCustomer } from "../../../lib/customer.server";

const TYPES = ["image/jpeg", "image/png", "image/webp"];

export const Route = createFileRoute("/api/account/avatar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const me = await currentCustomer(request);
        if (!me) return json({ ok: false, error: "Please log in." }, { status: 401 });
        const { DB, STORAGE } = bindings();
        if (!DB || !STORAGE) return json({ ok: false, error: "Photo upload is not available." }, { status: 503 });
        const form = await request.formData();
        const file = form.get("photo");
        if (form.get("remove") === "1") {
          await DB.prepare("UPDATE customers SET avatar = '' WHERE id = ?").bind(me.id).run();
          return json({ ok: true, avatar: "" });
        }
        if (!(file instanceof File) || !file.size) return json({ ok: false, error: "Choose a photo." }, { status: 400 });
        if (!TYPES.includes(file.type)) return json({ ok: false, error: "Use a JPG, PNG or WebP photo." }, { status: 400 });
        if (file.size > 4 * 1024 * 1024) return json({ ok: false, error: "Photo is too large (max 4 MB)." }, { status: 400 });
        const key = `content/avatars/${me.id}-${crypto.randomUUID().slice(0, 10)}.${file.type.split("/")[1]}`;
        await STORAGE.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
        const url = `/media/${key}`;
        await DB.prepare("UPDATE customers SET avatar = ? WHERE id = ?").bind(url, me.id).run();
        return json({ ok: true, avatar: url });
      },
    },
  },
});
