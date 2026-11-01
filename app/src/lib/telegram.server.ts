import type { Settings } from "./catalog";
import { sha256 } from "./crypto.server";

export type TgResult = { ok: boolean; detail: string; result?: unknown };

export const tgReady = (s: Settings) => !!s.telegram_bot_token;

export async function tgApi(s: Settings, method: string, body: Record<string, unknown> = {}): Promise<TgResult> {
  if (!s.telegram_bot_token) return { ok: false, detail: "Telegram bot is not set up" };
  try {
    const r = await fetch(`https://api.telegram.org/bot${s.telegram_bot_token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = (await r.json().catch(() => ({}))) as { ok?: boolean; description?: string; result?: unknown };
    return d.ok ? { ok: true, detail: "ok", result: d.result } : { ok: false, detail: d.description ?? `HTTP ${r.status}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "network error" };
  }
}

/** Secret Telegram sends back on every webhook call, so nobody else can post to it. */
export async function tgWebhookSecret(s: Settings) {
  return (await sha256(`tt-webhook:${s.telegram_bot_token ?? ""}`)).slice(0, 48);
}

export function tgSendResetLink(s: Settings, chatId: string, name: string, link: string, minutes: number) {
  return tgApi(s, "sendMessage", {
    chat_id: chatId,
    text: `Hi ${name.split(" ")[0]}! Here is your Little Bean password reset link. It works once, for ${minutes} minutes.\n\nDidn't ask for this? Just ignore it, your password stays the same.`,
    reply_markup: { inline_keyboard: [[{ text: "Reset my password", url: link }]] },
  });
}

export const SHARE_KEYBOARD = {
  keyboard: [[{ text: "Share my phone number", request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};
