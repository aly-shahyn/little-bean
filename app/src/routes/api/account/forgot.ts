import { createFileRoute } from "@tanstack/react-router";

import { json } from "../../../lib/admin.server";
import { bindings } from "../../../lib/bindings.server";
import { normalizePhone } from "../../../lib/catalog";
import { RESET_MINUTES, deliverResetLink, issueResetLink } from "../../../lib/reset.server";
import { readSettings } from "../../../lib/shop.server";
import { tgReady } from "../../../lib/telegram.server";
import { notifyOwner, ownerAlertsReady } from "../../../lib/whatsapp.server";

/**
 * Forgot password:
 * number -> account -> one-time secure token -> reset URL -> Telegram bot / SMS / WhatsApp -> customer.
 * Customers who haven't connected Telegram yet are shown the bot link; sharing their number there
 * links the chat and delivers the waiting reset link.
 */
export const Route = createFileRoute("/api/account/forgot")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { DB } = bindings();
        if (!DB) return json({ ok: false, error: "Not available right now." }, { status: 503 });
        const b = (await request.json().catch(() => ({}))) as { phone?: string };
        const phone = normalizePhone(String(b.phone ?? ""));
        if (phone.length < 10) return json({ ok: false, error: "Please enter your mobile number." }, { status: 400 });

        const settings = await readSettings();
        const c = await DB.prepare("SELECT id, name, phone, telegram_chat_id FROM customers WHERE phone = ? AND status != 'blocked'")
          .bind(phone)
          .first<{ id: number; name: string; phone: string; telegram_chat_id: string | null }>();

        if (c) {
          // One link per minute per number, so nobody can flood a customer.
          const recent = await DB.prepare("SELECT 1 AS x FROM customers WHERE id = ? AND reset_sent_at > datetime('now', '-60 seconds')").bind(c.id).first();
          if (!recent) {
            const link = await issueResetLink(DB, c, new URL(request.url).origin);
            const channel = await deliverResetLink(DB, settings, c, link);
            // Waiting for the customer to open the Telegram bot is normal, only alert the shop when there is no bot.
            if (!channel && !tgReady(settings) && ownerAlertsReady(settings))
              await notifyOwner(settings, `Password reset requested by ${c.name} (+${phone}), but the link could not be sent. Open Admin > Customers and tap "Send reset link".`).catch(() => undefined);
          }
        }
        // Same answer either way, so nobody can check which numbers have accounts.
        return json({ ok: true, minutes: RESET_MINUTES, telegram: tgReady(settings) ? settings.telegram_bot_username || "" : "" });
      },
    },
  },
});
