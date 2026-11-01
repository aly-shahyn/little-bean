import { createFileRoute } from "@tanstack/react-router";

import { json } from "../../../lib/admin.server";
import { bindings } from "../../../lib/bindings.server";
import { normalizePhone } from "../../../lib/catalog";
import { hashPassword } from "../../../lib/crypto.server";
import { createSession } from "../../../lib/customer.server";
import { RESET_MINUTES, deliverResetLink, issueResetLink } from "../../../lib/reset.server";
import { readSettings } from "../../../lib/shop.server";
import { tgReady } from "../../../lib/telegram.server";
import { notifyOwner, ownerAlertsReady } from "../../../lib/whatsapp.server";

export const Route = createFileRoute("/api/account/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { DB } = bindings();
        if (!DB) return json({ ok: false, error: "Accounts are not available right now." }, { status: 503 });
        const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const str = (k: string, max: number) => String(b[k] ?? "").trim().slice(0, max);
        const name = str("name", 80);
        const phone = normalizePhone(str("phone", 30));
        const password = String(b.password ?? "");
        const island = str("island", 60);
        const address = str("address", 300);
        const email = str("contact_email", 120) || str("email", 120); // sent as contact_email so the host's credential check doesn't block sign-ups
        if (name.length < 2) return json({ ok: false, error: "Please enter your name." }, { status: 400 });
        if (phone.length < 10) return json({ ok: false, error: "Please enter a valid Viber or WhatsApp number." }, { status: 400 });
        if (password.length < 6) return json({ ok: false, error: "Password needs at least 6 characters." }, { status: 400 });
        const exists = await DB.prepare("SELECT id, name, phone, pass_hash, status, telegram_chat_id FROM customers WHERE phone = ?").bind(phone)
          .first<{ id: number; name: string; phone: string; pass_hash: string; status: string; telegram_chat_id: string | null }>();
        const settings = await readSettings();
        if (exists && exists.pass_hash === "" && exists.status !== "blocked") {
          // The shop already created this customer (an in-store or phone order). Anyone can type a number,
          // so the account is only handed over through a one-time link sent to that number.
          const recent = await DB.prepare("SELECT 1 AS x FROM customers WHERE id = ? AND reset_sent_at > datetime('now', '-60 seconds')").bind(exists.id).first();
          if (!recent) {
            const link = await issueResetLink(DB, exists, new URL(request.url).origin);
            const channel = await deliverResetLink(DB, settings, exists, link);
            if (!channel && !tgReady(settings) && ownerAlertsReady(settings))
              await notifyOwner(settings, `${exists.name} (+${phone}) wants to set a password for the account you created. Open Admin > Customers and tap "Send login link".`).catch(() => undefined);
          }
          return json({ ok: true, claim: true, minutes: RESET_MINUTES, telegram: tgReady(settings) ? settings.telegram_bot_username || "" : "" });
        }
        if (exists) return json({ ok: false, error: "This number already has an account. Please log in." }, { status: 409 });
        const status = settings.require_approval === "0" ? "approved" : "pending";
        const res = await DB.prepare(
          "INSERT INTO customers (name, phone, email, island, address, pass_hash, status, approved_at) VALUES (?,?,?,?,?,?,?, CASE WHEN ? = 'approved' THEN datetime('now') END)",
        ).bind(name, phone, email, island, address, await hashPassword(password), status, status).run();
        const id = Number(res.meta.last_row_id);
        if (status === "pending" && ownerAlertsReady(settings)) {
          await notifyOwner(settings, `New customer sign-up waiting for approval: ${name} (+${phone})${island ? `, ${island}` : ""}`).catch(() => undefined);
        }
        return json({ ok: true, status }, { headers: { "set-cookie": await createSession(id) } });
      },
    },
  },
});
