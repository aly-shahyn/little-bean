import { createFileRoute } from "@tanstack/react-router";

import { json, listAdminUsers, manageUsers } from "../../../lib/admin.server";

// Super Admin: create, edit, reset and remove back-office logins.
export const Route = createFileRoute("/api/admin/team")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const err = await manageUsers(request, body);
        if (err) return json({ ok: false, error: err }, { status: 400 });
        return json({ ok: true, users: await listAdminUsers() });
      },
    },
  },
});
