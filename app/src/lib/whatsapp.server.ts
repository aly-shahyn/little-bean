import { bindings } from "./bindings.server";
import { normalizePhone, type Settings } from "./catalog";

export type WaResult = { ok: boolean; detail: string };

/** True when the WhatsApp Business (Cloud API) connection details are filled in. */
export function waReady(s: Settings): boolean {
  return !!(s.wa_phone_number_id && s.wa_token);
}

/**
 * Sends a WhatsApp message through Meta's Cloud API.
 * Uses the approved template when one is named (required for the first message to a customer),
 * otherwise a plain text message (only delivered inside a 24h customer-service window).
 */
export async function sendWhatsApp(
  s: Settings,
  toRaw: string,
  opts: { template?: string; params?: string[]; text: string },
): Promise<WaResult> {
  if (!waReady(s)) return { ok: false, detail: "WhatsApp API not connected" };
  const to = normalizePhone(toRaw);
  if (to.length < 8) return { ok: false, detail: "Invalid phone number" };
  const body = opts.template
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: opts.template,
          language: { code: s.wa_lang || "en" },
          components: opts.params?.length
            ? [{ type: "body", parameters: opts.params.map((p) => ({ type: "text", text: p.slice(0, 1000) })) }]
            : [],
        },
      }
    : { messaging_product: "whatsapp", to, type: "text", text: { body: opts.text.slice(0, 4000) } };
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(s.wa_phone_number_id)}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${s.wa_token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string }; messages?: { id: string }[] };
    if (!res.ok) return { ok: false, detail: data.error?.message?.slice(0, 200) || `HTTP ${res.status}` };
    return { ok: true, detail: opts.template ? `template ${opts.template}` : "text" };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message.slice(0, 200) : "network error" };
  }
}

export async function logNotify(code: string, line: string): Promise<void> {
  const { DB } = bindings();
  if (!DB) return;
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  await DB.prepare("UPDATE orders SET notify_log = notify_log || ? WHERE code = ?").bind(`${stamp} ${line}\n`, code).run();
}

/** The number that receives shop alerts: the dedicated alert number, else the shop WhatsApp number. */
export function ownerPhone(s: Settings): string {
  return normalizePhone(s.owner_notify_phone || s.whatsapp || "");
}

/** True when some channel for owner alerts is set up. */
export function ownerAlertsReady(s: Settings): boolean {
  return !!ownerPhone(s) && (!!s.callmebot_key || (waReady(s) && !!s.wa_tpl_admin));
}

/**
 * Sends an alert to the shop owner's own WhatsApp.
 * 1) CallMeBot (free, owner's own number only) when an API key is saved.
 * 2) Otherwise the WhatsApp Cloud API with the "admin alert" template ({{1}} = alert text).
 */
export async function notifyOwner(s: Settings, text: string): Promise<WaResult> {
  const to = ownerPhone(s);
  if (!to) return { ok: false, detail: "No shop WhatsApp number" };
  if (s.callmebot_key) {
    try {
      const url = `https://api.callmebot.com/whatsapp.php?phone=%2B${to}&text=${encodeURIComponent(text.slice(0, 1500))}&apikey=${encodeURIComponent(s.callmebot_key)}`;
      const res = await fetch(url);
      const body = (await res.text()).slice(0, 300);
      if (!res.ok || /error|invalid|not/i.test(body.replace(/<[^>]+>/g, "")) && !/queued|sent/i.test(body))
        return { ok: false, detail: `CallMeBot: ${body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 150) || res.status}` };
      return { ok: true, detail: "CallMeBot" };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : "CallMeBot error" };
    }
  }
  if (waReady(s) && s.wa_tpl_admin) {
    return sendWhatsApp(s, to, { template: s.wa_tpl_admin, params: [text.replace(/\n+/g, " | ").slice(0, 900)], text });
  }
  return { ok: false, detail: "Shop alerts not set up" };
}
