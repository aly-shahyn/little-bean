import type { D1Database } from "@cloudflare/workers-types";

import type { Settings } from "./catalog";
import { randomToken, sha256 } from "./crypto.server";
import { resetSmsText, sendSms, smsReady } from "./sms.server";
import { tgReady, tgSendResetLink } from "./telegram.server";
import { sendWhatsApp, waReady } from "./whatsapp.server";

export const RESET_MINUTES = 30;
export type ResetCustomer = { id: number; name: string; phone: string; telegram_chat_id?: string | null };

/** Creates a fresh one-time token (only its hash is stored) and returns the reset URL. */
export async function issueResetLink(DB: D1Database, c: ResetCustomer, origin: string, minutes = RESET_MINUTES): Promise<string> {
  const token = randomToken();
  await DB.prepare(`UPDATE customers SET reset_hash = ?, reset_expires = datetime('now', '+${Math.floor(minutes)} minutes'), reset_sent_at = datetime('now') WHERE id = ?`)
    .bind(await sha256(token), c.id)
    .run();
  return `${origin}/reset?token=${token}`;
}

/** Delivers a reset link: Telegram (if the customer connected it), then SMS, then WhatsApp. Returns the channel used or "". */
export async function deliverResetLink(DB: D1Database, s: Settings, c: ResetCustomer, link: string, minutes = RESET_MINUTES): Promise<string> {
  let channel = "";
  if (tgReady(s) && c.telegram_chat_id) {
    const r = await tgSendResetLink(s, c.telegram_chat_id, c.name, link, minutes);
    if (r.ok) channel = "telegram";
  }
  const text = resetSmsText(c.name, link, minutes);
  if (!channel && smsReady(s)) {
    const r = await sendSms(s, c.phone, text);
    if (r.ok) channel = "sms";
  }
  if (!channel && waReady(s)) {
    const r = await sendWhatsApp(s, c.phone, { text });
    if (r.ok) channel = "whatsapp";
  }
  await DB.prepare("UPDATE customers SET reset_channel = ?, reset_requested_at = CASE WHEN ? = '' THEN datetime('now') ELSE NULL END WHERE id = ?")
    .bind(channel || "failed", channel, c.id)
    .run();
  return channel;
}
