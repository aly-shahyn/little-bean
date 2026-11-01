import { createFileRoute } from "@tanstack/react-router";

import { adminAuthGet, adminAuthPost } from "../../../lib/admin-auth.server";

export const Route = createFileRoute("/api/admin/session")({
  server: {
    handlers: {
      POST: ({ request }) => adminAuthPost(request),
      GET: ({ request }) => adminAuthGet(request),
    },
  },
});
