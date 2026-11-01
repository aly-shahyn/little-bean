import { useState } from "react";

import type { Settings } from "../../../lib/catalog";
import { Btn, Card, inputCls, postJson } from "./ui";

const KEYS = ["sms_provider", "sms_twilio_sid", "sms_twilio_token", "sms_twilio_from", "sms_twilio_service", "sms_http_url", "sms_http_method", "sms_http_headers", "sms_http_body", "sms_sender"];

/** SMS gateway used for automatic password reset links. */
export function SmsSettings({ settings, onChange }: { settings: Settings; onChange: () => void }) {
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(KEYS.map((k) => [k, k === "sms_twilio_token" || k === "sms_http_headers" ? "" : (settings[k] ?? "")])));
  const [msg, setMsg] = useState("");
  const [phone, setPhone] = useState("");
  const [test, setTest] = useState("");
  const set = (k: string, val: string) => setV((c) => ({ ...c, [k]: val }));
  const p = v.sms_provider;
  const live = (settings.sms_provider === "twilio" && settings.sms_twilio_sid && settings.sms_twilio_token_set === "1") || (settings.sms_provider === "http" && settings.sms_http_url);

  async function save() {
    setMsg("Saving...");
    try { await postJson({ kind: "settings", values: v }); setMsg("Saved"); set("sms_twilio_token", ""); set("sms_http_headers", ""); onChange(); } catch (e) { setMsg(e instanceof Error ? e.message : "Error"); }
  }
  const f = (k: string, label: string, hint?: string, extra?: { secret?: boolean; area?: boolean; ph?: string }) => (
    <label key={k} className={`text-sm font-semibold ${extra?.area ? "sm:col-span-2" : ""}`}>
      {label}
      {extra?.area ? (
        <textarea rows={3} value={v[k]} onChange={(e) => set(k, e.target.value)} placeholder={extra?.ph} className={`${inputCls} font-mono text-[13px]`} />
      ) : (
        <input type={extra?.secret ? "password" : "text"} value={v[k]} onChange={(e) => set(k, e.target.value)} placeholder={extra?.ph} className={inputCls} />
      )}
      {hint ? <span className="mt-1 block text-xs font-normal text-tt-soft">{hint}</span> : null}
    </label>
  );

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="tt-display text-xl font-bold">SMS for password reset</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${live ? "bg-tt-sage text-tt-mintdeep" : "bg-tt-butter text-[#7A5A0E]"}`}>{live ? "Connected" : "Not connected"}</span>
      </div>
      <p className="mt-2 text-sm text-tt-soft">
        When a customer taps Forgot password, the website creates a one-time secure link (valid 30 minutes) and texts it to their mobile. Telegram is used first for customers who connected it, then SMS, then WhatsApp.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">SMS provider
          <select value={p} onChange={(e) => set("sms_provider", e.target.value)} className={inputCls}>
            <option value="">Off</option>
            <option value="http">My SMS gateway (Ooredoo, Dhiraagu or other HTTP API)</option>
            <option value="twilio">Twilio</option>
          </select>
        </label>
        {f("sms_sender", "Sender name", "Shown as the sender if your gateway allows it (max 11 letters).", { ph: "LittleBean" })}
        {p === "twilio" ? (
          <>
            {f("sms_twilio_sid", "Account SID", "Twilio Console, Account info", { ph: "AC..." })}
            {f("sms_twilio_token", "Auth token", settings.sms_twilio_token_set === "1" ? "Saved. Leave empty to keep it." : "Saved securely and never shown again.", { secret: true })}
            {f("sms_twilio_from", "From number", "Your Twilio number, e.g. +1415...", { ph: "+1..." })}
            {f("sms_twilio_service", "Messaging Service SID (optional)", "Use instead of the From number for an alphanumeric sender.", { ph: "MG..." })}
          </>
        ) : null}
        {p === "http" ? (
          <>
            {f("sms_http_url", "API URL", "Placeholders: {to} 9607771234, {to_plus} +9607771234, {to_local} 7771234, {sender}, {message}", { area: true, ph: "https://sms.provider.mv/api/send?user=...&to={to}&text={message}" })}
            <label className="text-sm font-semibold">Method
              <select value={v.sms_http_method || "POST"} onChange={(e) => set("sms_http_method", e.target.value)} className={inputCls}>
                <option>POST</option><option>GET</option>
              </select>
            </label>
            <span />
            {f("sms_http_headers", "Headers (one per line)", settings.sms_http_headers_set === "1" ? "Saved. Leave empty to keep them." : "e.g. Authorization: Bearer YOUR_API_KEY. Saved securely.", { area: true, secret: true, ph: "Authorization: Bearer ..." })}
            {v.sms_http_method !== "GET" ? f("sms_http_body", "Request body (POST)", "JSON or form text with the same placeholders.", { area: true, ph: '{"to":"{to}","from":"{sender}","message":"{message}"}' }) : null}
          </>
        ) : null}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3"><Btn onClick={() => void save()}>Save SMS settings</Btn><span className="text-sm text-tt-soft">{msg}</span></div>
      {live ? (
        <div className="mt-5 flex flex-wrap items-end gap-2 rounded-2xl bg-tt-milk p-4">
          <label className="min-w-0 flex-1 text-sm font-semibold">Send a test SMS to<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="7XX XXXX" className={inputCls} /></label>
          <Btn tone="ghost" onClick={async () => { setTest("Sending..."); try { const d = await postJson({ kind: "sms_test", phone }); setTest(`Sent (${d.detail ?? "ok"})`); } catch (e) { setTest(e instanceof Error ? e.message : "Failed"); } }}>Send test</Btn>
          {test ? <p className="w-full text-sm text-tt-soft">{test}</p> : null}
        </div>
      ) : null}
    </Card>
  );
}
