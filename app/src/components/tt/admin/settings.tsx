import { useState } from "react";

import type { Settings } from "../../../lib/catalog";
import { Btn, Card, inputCls, postJson } from "./ui";

const GENERAL: { k: string; label: string; hint?: string; long?: boolean }[] = [
  { k: "whatsapp", label: "Shop WhatsApp number", hint: "e.g. 9991234 or 9609991234" },
  { k: "viber", label: "Shop Viber number" },
  { k: "bank_name", label: "Bank name" },
  { k: "bank_account_name", label: "Account name" },
  { k: "bank_account_number", label: "Account number" },
  { k: "delivery_fee", label: "Delivery fee (MVR)", hint: "0 = confirm in chat" },
  { k: "instagram", label: "Instagram handle" },
  { k: "delivery_note", label: "Delivery note", long: true },
  { k: "announcement", label: "Top announcement bar (leave empty to hide)", long: true },
  { k: "points_per_mvr", label: "Bean Points: spend (MVR) for 1 point", hint: "10 = 1 point for every MVR 10" },
  { k: "point_value", label: "Bean Points: value of 1 point (MVR)", hint: "0.5 = 5% back" },
  { k: "points_min_redeem", label: "Bean Points: minimum to use at checkout", hint: "e.g. 20" },
];

const WA: { k: string; label: string; hint?: string; secret?: boolean }[] = [
  { k: "wa_phone_number_id", label: "Phone number ID", hint: "Meta developer dashboard, WhatsApp, API setup" },
  { k: "wa_token", label: "Permanent access token", hint: "Saved securely and never shown again. Leave empty to keep the current one.", secret: true },
  { k: "wa_lang", label: "Template language code", hint: "Usually en or en_US" },
  { k: "wa_tpl_placed", label: "Template: order received", hint: "Body uses {{1}} name, {{2}} order number, {{3}} total" },
  { k: "wa_tpl_confirmed", label: "Template: order confirmed", hint: "Body uses {{1}} name, {{2}} order number, {{3}} total" },
  { k: "wa_tpl_account", label: "Template: account approved", hint: "Body uses {{1}} name" },
  { k: "wa_tpl_admin", label: "Template: shop alert (optional)", hint: "Only needed if you don't use CallMeBot. Body uses {{1}} alert text" },
];

const OWNER: { k: string; label: string; hint?: string; secret?: boolean }[] = [
  { k: "owner_notify_phone", label: "Send shop alerts to (WhatsApp number)", hint: "Leave empty to use the shop WhatsApp number" },
  { k: "callmebot_key", label: "CallMeBot API key", hint: "Saved securely and never shown again. Leave empty to keep the current one.", secret: true },
];

export function SettingsPanel({ settings, onChange }: { settings: Settings; onChange: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>(() => ({ ...Object.fromEntries([...GENERAL, ...WA, ...OWNER].map((f) => [f.k, f.k === "wa_token" || f.k === "callmebot_key" ? "" : (settings[f.k] ?? "")])), require_approval: settings.require_approval ?? "1", slip_check: settings.slip_check ?? "1" }));
  const [msg, setMsg] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [ownerMsg, setOwnerMsg] = useState("");
  const ownerReady = settings.callmebot_set === "1" || (!!settings.wa_tpl_admin && settings.wa_token_set === "1");
  const set = (k: string, v: string) => setVals((c) => ({ ...c, [k]: v }));
  const connected = !!settings.wa_phone_number_id && settings.wa_token_set === "1";

  async function save(keys: string[]) {
    setMsg("Saving...");
    try {
      await postJson({ kind: "settings", values: Object.fromEntries(keys.map((k) => [k, vals[k]])) });
      setMsg("Saved");
      set("wa_token", "");
      set("callmebot_key", "");
      onChange();
    } catch (x) { setMsg(x instanceof Error ? x.message : "Error"); }
  }

  return (
    <div className="space-y-5">
      <Card>
        <h3 className="tt-display text-xl font-bold">Shop contact, payment & delivery</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {GENERAL.map((f) => (
            <label key={f.k} className={`text-sm font-semibold ${f.long ? "sm:col-span-2" : ""}`}>
              {f.label}
              {f.long ? <textarea rows={2} value={vals[f.k]} onChange={(e) => set(f.k, e.target.value)} className={inputCls} /> : <input value={vals[f.k]} onChange={(e) => set(f.k, e.target.value)} className={inputCls} />}
              {f.hint ? <span className="mt-1 block text-xs font-normal text-tt-soft">{f.hint}</span> : null}
            </label>
          ))}
          <label className="flex items-center gap-3 text-sm font-semibold sm:col-span-2">
            <input type="checkbox" checked={vals.require_approval === "0"} onChange={(e) => set("require_approval", e.target.checked ? "0" : "1")} className="h-5 w-5 accent-[#1B8053]" />
            Instant account verification (new customers can order right away, no approval needed)
          </label>
          <label className="flex items-start gap-3 text-sm font-semibold sm:col-span-2">
            <input type="checkbox" checked={vals.slip_check !== "0"} onChange={(e) => set("slip_check", e.target.checked ? "1" : "0")} className="mt-0.5 h-5 w-5 accent-[#1B8053]" />
            <span>Check transfer slips automatically<span className="block text-xs font-normal text-tt-soft">Place order unlocks only for a BML or MIB slip showing the exact order total, paid into the account number above, from the last 3 days, not used before. Turn off if a bank changes its slip design. A slip is always required.</span></span>
          </label>
        </div>
        <div className="mt-5 flex items-center gap-3"><Btn onClick={() => void save([...GENERAL.map((f) => f.k), "require_approval", "slip_check"])}>Save</Btn><span className="text-sm text-tt-soft">{msg}</span></div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="tt-display text-xl font-bold">New order alerts to your WhatsApp</h3>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${ownerReady ? "bg-tt-sage text-tt-mintdeep" : "bg-tt-butter"}`}>{ownerReady ? "On" : "Off"}</span>
        </div>
        <p className="mt-2 text-sm text-tt-soft">Get a WhatsApp message on your own phone every time a customer places an order or signs up. The quickest way is the free CallMeBot service (2 minutes):</p>
        <ol className="mt-3 list-decimal space-y-1.5 rounded-2xl bg-tt-milk p-4 pl-9 text-sm text-tt-ink/80">
          <li>On the phone that should get the alerts, save the CallMeBot number shown on callmebot.com (currently +34 694 23 41 84) in your contacts.</li>
          <li>Send it this WhatsApp message: <b>I allow callmebot to send me messages</b></li>
          <li>You'll get a reply with your API key. Paste it below, save, then press "Send test alert".</li>
        </ol>
        <p className="mt-2 text-xs text-tt-soft">CallMeBot is a free third-party service meant for messages to your own number. If you connect the official WhatsApp Business API below, you can use a "shop alert" template instead.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {OWNER.map((f) => (
            <label key={f.k} className="text-sm font-semibold">
              {f.label}
              <input type={f.secret ? "password" : "text"} value={vals[f.k]} onChange={(e) => set(f.k, e.target.value)} placeholder={f.secret && settings.callmebot_set === "1" ? "Saved (hidden)" : f.k === "owner_notify_phone" ? settings.whatsapp : ""} className={inputCls} autoComplete="off" />
              {f.hint ? <span className="mt-1 block text-xs font-normal text-tt-soft">{f.hint}</span> : null}
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Btn onClick={() => void save(OWNER.map((f) => f.k))}>Save alert settings</Btn>
          <Btn tone="ghost" onClick={async () => { setOwnerMsg("Sending..."); try { await postJson({ kind: "owner_test" }); setOwnerMsg("Sent! Check your WhatsApp."); } catch (x) { setOwnerMsg(x instanceof Error ? x.message : "Failed"); } }}>Send test alert</Btn>
          {settings.callmebot_set === "1" ? <Btn tone="danger" onClick={async () => { await postJson({ kind: "settings", values: { callmebot_key: "__clear__" } }); onChange(); }}>Remove key</Btn> : null}
          <span className="text-sm text-tt-soft">{ownerMsg}</span>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="tt-display text-xl font-bold">Automatic WhatsApp messages to customers</h3>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${connected ? "bg-tt-sage text-tt-mintdeep" : "bg-tt-butter"}`}>{connected ? "Connected" : "Not connected"}</span>
        </div>
        <p className="mt-2 text-sm text-tt-soft">
          Connect the official WhatsApp Business Platform (Meta) so customers get messages automatically when they order, when you confirm, and when you approve their account.
          Until it's connected, use the WhatsApp and Viber buttons on each order. Viber can't send automatic messages, so it always uses the button.
        </p>
        <details className="mt-3 rounded-2xl bg-tt-milk p-4 text-sm">
          <summary className="cursor-pointer font-semibold">How to set it up (about 20 minutes)</summary>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-tt-ink/80">
            <li>Go to business.facebook.com and create or open your Meta Business account.</li>
            <li>Go to developers.facebook.com, create an app of type "Business" and add the WhatsApp product.</li>
            <li>Add and verify your shop's business phone number (a number not already used on the WhatsApp app).</li>
            <li>Copy the "Phone number ID". In Business settings, create a System User, give it the app, and generate a permanent token with whatsapp_business_messaging permission.</li>
            <li>In WhatsApp Manager, create three "Utility" message templates, for example: order_received: "Hi {"{{1}}"}, thanks for your order {"{{2}}"} ({"{{3}}"}). We'll confirm it shortly." order_confirmed: "Hi {"{{1}}"}, your order {"{{2}}"} ({"{{3}}"}) is confirmed!" account_approved: "Hi {"{{1}}"}, your Little Bean account is approved. Happy shopping!"</li>
            <li>When Meta approves them, paste the ID, token and template names here and save. Then send a test.</li>
          </ol>
        </details>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {WA.map((f) => (
            <label key={f.k} className="text-sm font-semibold">
              {f.label}
              <input type={f.secret ? "password" : "text"} value={vals[f.k]} onChange={(e) => set(f.k, e.target.value)} placeholder={f.secret && settings.wa_token_set === "1" ? "Saved (hidden)" : ""} className={inputCls} autoComplete="off" />
              {f.hint ? <span className="mt-1 block text-xs font-normal text-tt-soft">{f.hint}</span> : null}
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Btn onClick={() => void save(WA.map((f) => f.k))}>Save WhatsApp settings</Btn>
          {settings.wa_token_set === "1" ? <Btn tone="danger" onClick={async () => { if (window.confirm("Disconnect WhatsApp?")) { await postJson({ kind: "settings", values: { wa_token: "__clear__" } }); onChange(); } }}>Disconnect</Btn> : null}
        </div>
        {connected ? (
          <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-tt-line pt-5">
            <label className="text-sm font-semibold">Send a test to<input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="7XX XXXX" className={inputCls} /></label>
            <Btn tone="ghost" onClick={async () => {
              setTestMsg("Sending...");
              try { await postJson({ kind: "wa_test", phone: testPhone, template: "hello_world" }); setTestMsg("Sent! Check WhatsApp."); } catch (x) { setTestMsg(x instanceof Error ? x.message : "Failed"); }
            }}>Send test</Btn>
            <span className="text-sm text-tt-soft">{testMsg}</span>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
