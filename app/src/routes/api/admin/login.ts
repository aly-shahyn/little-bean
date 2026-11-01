import { createFileRoute } from "@tanstack/react-router";

import { adminAuthGet, adminAuthPost } from "../../../lib/admin-auth.server";

// Older address, kept so open tabs keep working. New code uses /api/admin/session.
export const Route = createFileRoute("/api/admin/login")({
  server: {
    handlers: {
      POST: ({ request }) => adminAuthPost(request),
      GET: ({ request }) => adminAuthGet(request),
    },
  },
});
