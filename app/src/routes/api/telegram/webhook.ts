import { createFileRoute } from "@tanstack/react-router";

import { json } from "../../../lib/admin.server";
import { bindings } from "../../../lib/bindings.server";
import { normalizePhone } from "../../../lib/catalog";
import { safeEqual } from "../../../lib/crypto.server";
import { RESET_MINUTES, issueResetLink } from "../../../lib/reset.server";
import { readSettings } from "../../../lib/shop.server";
import { SHARE_KEYBOARD, tgApi, tgSendResetLink, tgWebhookSecret } from "../../../lib/telegram.server";

type TgMessage = {
  chat: { id: number; type: string };
  from?: { id: number; first_name?: string };
  text?: string;
  contact?: { phone_number: string; user_id?: number; first_name?: string };
};
type Cust = { id: number; name: string; phone: string; telegram_chat_id: string | null; reset_sent_at: string | null; pending: number };

const SELECT = "SELECT id, name, phone, telegram_chat_id, reset_sent_at, CASE WHEN reset_requested_at > datetime('now', '-30 minutes') OR (reset_channel = 'failed' AND reset_sent_at > datetime('now', '-30 minutes')) THEN 1 ELSE 0 END AS pending FROM customers";

/**
 * Telegram bot webhook.
 * /start or /reset -> ask the customer to share their phone number (one tap).
 * Shared contact must be their own and match an account -> chat is linked to that account.
 * If a reset was requested on the website (or they typed /reset), a fresh reset link is sent right away.
 */
export const Route = createFileRoute("/api/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const settings = await readSettings();
        const expected = await tgWebhookSecret(settings);
        const got = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
        if (!settings.telegram_bot_token || !safeEqual(got, expected)) return json({ ok: false }, { status: 401 });
        const { DB } = bindings();
        if (!DB) return json({ ok: true });

        const update = (await request.json().catch(() => ({}))) as { message?: TgMessage };
        const msg = update.message;
        if (!msg || msg.chat.type !== "private") return json({ ok: true });
        const chatId = String(msg.chat.id);
        const origin = new URL(request.url).origin;
        const say = (text: string, extra: Record<string, unknown> = {}) => tgApi(settings, "sendMessage", { chat_id: chatId, text, ...extra });

        async function sendLink(c: Cust) {
          const link = await issueResetLink(DB!, c, origin);
          const r = await tgSendResetLink(settings, chatId, c.name, link, RESET_MINUTES);
          await DB!.prepare("UPDATE customers SET reset_channel = ?, reset_requested_at = NULL WHERE id = ?").bind(r.ok ? "telegram" : "failed", c.id).run();
        }

        // 1) Customer shared a contact.
        if (msg.contact) {
          if (!msg.from || msg.contact.user_id !== msg.from.id) {
            await say("Please use the button below to share your own phone number.", { reply_markup: SHARE_KEYBOARD });
            return json({ ok: true });
          }
          const phone = normalizePhone(msg.contact.phone_number.replace(/^\+/, ""));
          const c = await DB.prepare(`${SELECT} WHERE phone = ? AND status != 'blocked'`).bind(phone).first<Cust>();
          if (!c) {
            await say(`We couldn't find a Little Bean account for +${phone}. Please sign up on our website first: ${origin}/account`, { reply_markup: { remove_keyboard: true } });
            return json({ ok: true });
          }
          await DB.batch([
            DB.prepare("UPDATE customers SET telegram_chat_id = NULL WHERE telegram_chat_id = ? AND id != ?").bind(chatId, c.id),
            DB.prepare("UPDATE customers SET telegram_chat_id = ?, telegram_linked_at = datetime('now') WHERE id = ?").bind(chatId, c.id),
          ]);
          await say(`Thanks ${c.name.split(" ")[0]}, your Telegram is now connected to your Little Bean account.`, { reply_markup: { remove_keyboard: true } });
          if (c.pending) await sendLink(c);
          else await say("Whenever you forget your password, tap Forgot password on the website, or send /reset here, and the link will arrive in this chat.");
          return json({ ok: true });
        }

        // 2) Commands.
        const text = (msg.text ?? "").trim();
        const linked = await DB.prepare(`${SELECT} WHERE telegram_chat_id = ? AND status != 'blocked'`).bind(chatId).first<Cust>();
        const wantsReset = /^\/reset\b/i.test(text) || /^\/start\s+reset/i.test(text);
        if (linked && wantsReset) {
          const recent = linked.reset_sent_at && Date.now() - new Date(linked.reset_sent_at.replace(" ", "T") + "Z").getTime() < 60_000;
          if (recent && !linked.pending) await say("A reset link was sent less than a minute ago. Please check the message above.");
          else await sendLink(linked);
          return json({ ok: true });
        }
        if (linked && /^\/start/i.test(text)) {
          await say(`Hi ${linked.name.split(" ")[0]}! Your account is connected. Send /reset any time to get a password reset link.`);
          return json({ ok: true });
        }
        await say("Hello from Little Bean! To get your password reset link, tap the button below to share the phone number you use for your account.", { reply_markup: SHARE_KEYBOARD });
        return json({ ok: true });
      },
    },
  },
});
