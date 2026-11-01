import { createFileRoute } from "@tanstack/react-router";

import { isAdmin } from "../../lib/admin.server";
import { bindings } from "../../lib/bindings.server";

export const Route = createFileRoute("/media/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const key = String((params as { _splat?: string })._splat ?? "");
        if (!key || key.includes("..")) return new Response("Not found", { status: 404 });
        const isSlip = key.startsWith("slips/");
        if (!isSlip && !key.startsWith("products/") && !key.startsWith("content/")) return new Response("Not found", { status: 404 });
        if (isSlip && !(await isAdmin(request))) return new Response("Forbidden", { status: 403 });
        const { STORAGE } = bindings();
        if (!STORAGE) return new Response("Not found", { status: 404 });
        const obj = await STORAGE.get(key);
        if (!obj) return new Response("Not found", { status: 404 });
        return new Response(obj.body as unknown as ReadableStream, {
          headers: {
            "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream",
            "cache-control": isSlip ? "private, no-store" : "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
