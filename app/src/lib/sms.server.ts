import { normalizePhone, type Settings } from "./catalog";

export type SmsResult = { ok: boolean; detail: string };

/**
 * SMS providers:
 *  - "twilio": Twilio Programmable SMS (works for Maldives +960 numbers).
 *  - "http":   any SMS gateway with an HTTP API (e.g. Ooredoo or Dhiraagu bulk SMS).
 *              URL / body use placeholders {to} (9607771234), {to_plus} (+9607771234), {to_local} (7771234), {sender} and {message}.
 */
export function smsProvider(s: Settings): "" | "twilio" | "http" {
  if (s.sms_provider === "twilio" && s.sms_twilio_sid && s.sms_twilio_token && (s.sms_twilio_from || s.sms_twilio_service)) return "twilio";
  if (s.sms_provider === "http" && s.sms_http_url) return "http";
  return "";
}
export const smsReady = (s: Settings) => smsProvider(s) !== "";

function fill(tpl: string, vars: Record<string, string>, encode: (v: string) => string) {
  return tpl.replace(/\{(to|to_plus|to_local|sender|message)\}/g, (_, k: string) => encode(vars[k] ?? ""));
}

export async function sendSms(s: Settings, toRaw: string, message: string): Promise<SmsResult> {
  const to = normalizePhone(toRaw);
  if (to.length < 10) return { ok: false, detail: "Invalid phone number" };
  const provider = smsProvider(s);
  try {
    if (provider === "twilio") {
      const body = new URLSearchParams({ To: `+${to}`, Body: message });
      if (s.sms_twilio_service) body.set("MessagingServiceSid", s.sms_twilio_service);
      else body.set("From", s.sms_twilio_from);
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(s.sms_twilio_sid)}/Messages.json`, {
        method: "POST",
        headers: { authorization: `Basic ${btoa(`${s.sms_twilio_sid}:${s.sms_twilio_token}`)}`, "content-type": "application/x-www-form-urlencoded" },
        body,
      });
      const d = (await r.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number };
      return r.ok ? { ok: true, detail: `twilio ${d.sid ?? ""}`.trim() } : { ok: false, detail: `twilio ${r.status}: ${d.message ?? "error"}` };
    }
    if (provider === "http") {
      const vars = { to, to_plus: `+${to}`, to_local: to.startsWith("960") ? to.slice(3) : to, sender: s.sms_sender || "LittleBean", message };
      const method = (s.sms_http_method || "POST").toUpperCase() === "GET" ? "GET" : "POST";
      const url = fill(s.sms_http_url, vars, encodeURIComponent);
      const headers: Record<string, string> = {};
      for (const line of (s.sms_http_headers || "").split("\n")) {
        const i = line.indexOf(":");
        if (i > 0) headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      }
      let body: string | undefined;
      if (method === "POST") {
        const tpl = s.sms_http_body || '{"to":"{to}","from":"{sender}","message":"{message}"}';
        const isJson = tpl.trim().startsWith("{");
        body = fill(tpl, vars, isJson ? (v) => JSON.stringify(v).slice(1, -1) : encodeURIComponent);
        if (!Object.keys(headers).some((h) => h.toLowerCase() === "content-type")) headers["content-type"] = isJson ? "application/json" : "application/x-www-form-urlencoded";
      }
      const r = await fetch(url, { method, headers, body });
      const text = (await r.text().catch(() => "")).slice(0, 160);
      return r.ok ? { ok: true, detail: `http ${r.status} ${text}`.trim() } : { ok: false, detail: `http ${r.status}: ${text}` };
    }
    return { ok: false, detail: "SMS is not set up" };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "network error" };
  }
}

/** The text a customer receives. Kept short so it fits in one or two SMS parts. */
export function resetSmsText(name: string, link: string, minutes: number) {
  return `Little Bean: Hi ${name.split(" ")[0]}, reset your password here (valid ${minutes} min): ${link}\nDidn't ask? Just ignore this message.`;
}
