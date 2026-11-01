import { useState } from "react";

import { approvedMessageForCustomer, normalizePhone, type Settings } from "../../../lib/catalog";
import { Btn, Card, postJson } from "./ui";
import { fmtDate, type AdminCustomer } from "./types";

const TINT: Record<string, string> = { pending: "#FFD6C7", approved: "#D8F3E3", blocked: "#EEEEEE" };
const LABEL: Record<string, string> = { pending: "Waiting for approval", approved: "Approved", blocked: "Blocked" };

function CustomerRow({ c, settings, onChange }: { c: AdminCustomer; settings: Settings; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");
  const [reset, setReset] = useState<{ message: string; notified: boolean | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const phone = normalizePhone(c.phone);
  const waOn = settings.wa_phone_number_id && settings.wa_token_set === "1";

  async function act(action: string) {
    setBusy(true);
    setInfo("");
    try {
      const d = await postJson({ kind: "customer", id: c.id, action });
      if (action === "approved") setInfo(d.notified ? "Approved. WhatsApp message sent." : waOn ? `Approved. Automatic WhatsApp failed${d.detail ? `: ${d.detail}` : ""}.` : "Approved. Let them know with the WhatsApp button.");
      onChange();
    } catch (e) { setInfo(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  }

  return (
    <li className={`rounded-3xl bg-white p-5 ring-1 ${c.status === "pending" ? "ring-2 ring-tt-coral/60" : "ring-tt-line"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="tt-display text-lg font-bold">{c.name}</span>
        <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: TINT[c.status] ?? "#eee" }}>{LABEL[c.status] ?? c.status}</span>
        {c.reset_requested_at ? <span className="rounded-full bg-tt-butter px-3 py-1 text-xs font-bold">Forgot password, link not delivered, {fmtDate(c.reset_requested_at)}</span> : null}
        {!c.reset_requested_at && c.reset_sent_at && ["sms", "whatsapp", "telegram"].includes(c.reset_channel ?? "") ? <span className="rounded-full bg-[#CDEBFF] px-3 py-1 text-xs font-bold text-[#1F5870]">Reset link sent by {c.reset_channel === "sms" ? "SMS" : c.reset_channel === "telegram" ? "Telegram" : "WhatsApp"}, {fmtDate(c.reset_sent_at)}</span> : null}
        {c.has_login === 0 ? <span className="rounded-full bg-[#FFD6C7] px-3 py-1 text-xs font-bold text-[#8A3B22]" title="Created from a shop order. The customer sets a password with a link sent to their number (Create account on the website, or Send login link here).">Added by shop{c.created_by ? ` (${c.created_by})` : ""} · no password yet</span> : null}
        {c.telegram ? <span className="rounded-full bg-[#E3F2FB] px-3 py-1 text-xs font-bold text-[#1C7FB5]">Telegram connected</span> : null}
        {c.reset_channel === "done" && c.reset_sent_at ? <span className="rounded-full bg-tt-sage px-3 py-1 text-xs font-bold text-tt-mintdeep">Password reset done</span> : null}
        <span className="ml-auto text-sm text-tt-soft">Joined {fmtDate(c.created_at)}</span>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-1 text-[14px] sm:grid-cols-2">
        <div><dt className="inline text-tt-soft">Phone: </dt><dd className="inline font-semibold">+{phone}</dd></div>
        <div><dt className="inline text-tt-soft">Email: </dt><dd className="inline">{c.email || "none"}</dd></div>
        <div className="sm:col-span-2"><dt className="inline text-tt-soft">Address: </dt><dd className="inline">{c.address || "none"}{c.island ? `, ${c.island}` : ""}</dd></div>
        <div><dt className="inline text-tt-soft">Orders: </dt><dd className="inline">{c.order_count}</dd></div>
        <div><dt className="inline text-tt-soft">Bean Points: </dt><dd className="inline font-semibold text-[#9A6A12]">{c.points ?? 0}</dd></div>
        <div><dt className="inline text-tt-soft">Last login: </dt><dd className="inline">{fmtDate(c.last_login) || "never"}</dd></div>
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {c.status !== "approved" ? <Btn onClick={() => void act("approved")} disabled={busy}>Approve</Btn> : null}
        {c.status !== "blocked" ? <Btn tone="ghost" onClick={() => void act("blocked")} disabled={busy}>Block</Btn> : null}
        {c.status === "blocked" ? <Btn tone="ghost" onClick={() => void act("pending")} disabled={busy}>Unblock</Btn> : null}
        <a href={`https://wa.me/${phone}?text=${encodeURIComponent(c.status === "approved" ? approvedMessageForCustomer(c.name) : `Hi ${c.name.split(" ")[0]}, this is Little Bean.`)}`} target="_blank" rel="noreferrer" className="rounded-full bg-[#1FAF5A] px-4 py-2.5 text-sm font-semibold text-white">WhatsApp</a>
        <a href={`viber://chat?number=%2B${phone}`} className="rounded-full bg-[#6F4BC8] px-4 py-2.5 text-sm font-semibold text-white">Viber</a>
        <Btn tone="ghost" disabled={busy} onClick={async () => {
          const v = window.prompt(`Give or remove Bean Points for ${c.name} (e.g. 50 or -20):`);
          const n = Math.floor(Number(v));
          if (!v || !n) return;
          setBusy(true);
          try { await postJson({ kind: "points_adjust", customer_id: c.id, change: n, note: n > 0 ? "Gift from Little Bean" : "Adjusted by the shop" }); setInfo(`${n > 0 ? "Added" : "Removed"} ${Math.abs(n)} points.`); onChange(); } catch (e) { setInfo(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
        }}>Points</Btn>
        <Btn tone={c.reset_requested_at ? "leaf" : "ghost"} disabled={busy} onClick={async () => {
          setBusy(true);
          try {
            const d = (await postJson({ kind: "customer_reset", id: c.id })) as unknown as { message: string; notified: boolean | null };
            setReset({ message: d.message, notified: d.notified });
            setCopied(false);
            onChange();
          } catch (e) { setInfo(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
        }}>{c.has_login === 0 ? "Send login link" : "Send reset link"}</Btn>
        <span className="ml-auto" />
        <Btn tone="danger" disabled={busy} onClick={() => { if (window.confirm(`Delete ${c.name}'s account? Their orders stay.`)) void act("delete"); }}>Delete</Btn>
      </div>
      {reset ? (
        <div className="mt-3 space-y-2 rounded-2xl bg-tt-butter p-4 text-sm">
          <p className="font-semibold">{reset.notified ? "Reset link sent automatically on WhatsApp." : "Reset link ready (valid 24 hours). Send it to the customer:"}</p>
          <div className="flex flex-wrap gap-2">
            <a href={`https://wa.me/${phone}?text=${encodeURIComponent(reset.message)}`} target="_blank" rel="noreferrer" className="rounded-full bg-[#1FAF5A] px-4 py-2 font-semibold text-white">Send on WhatsApp</a>
            <a href={`viber://chat?number=%2B${phone}`} className="rounded-full bg-[#6F4BC8] px-4 py-2 font-semibold text-white">Open Viber</a>
            <button type="button" onClick={() => navigator.clipboard?.writeText(reset.message).then(() => setCopied(true))} className="rounded-full bg-white px-4 py-2 font-semibold ring-1 ring-tt-line">{copied ? "Copied" : "Copy message"}</button>
          </div>
        </div>
      ) : null}
      {info ? <p className="mt-3 rounded-2xl bg-tt-sage px-4 py-2.5 text-sm font-semibold text-tt-mintdeep">{info}</p> : null}
    </li>
  );
}

export function CustomersPanel({ customers, settings, onChange }: { customers: AdminCustomer[]; settings: Settings; onChange: () => void }) {
  const [q, setQ] = useState("");
  const shown = customers.filter((c) => !q || `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-4">
        <p className="flex-1 text-sm text-tt-soft">
          Customers sign up with their Viber/WhatsApp number. {settings.require_approval === "0" ? "New accounts are approved automatically (change in Settings)." : "New accounts must be approved here before they can order."} Passwords are encrypted, so nobody (not even you) can see them.
        </p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone" className="rounded-full bg-tt-milk px-4 py-2.5 text-sm ring-1 ring-tt-line" />
      </Card>
      {shown.length ? <ul className="space-y-3">{shown.map((c) => <CustomerRow key={c.id} c={c} settings={settings} onChange={onChange} />)}</ul> : <Card><p className="text-center text-tt-soft">No customers yet.</p></Card>}
    </div>
  );
}
