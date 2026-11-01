import { useState } from "react";

import {
  DELIVERY_STEPS, confirmedMessageForCustomer, mvr, normalizePhone, paymentLabel, placedMessageForCustomer, statusOf, type PlacedOrder, type Settings,
} from "../../../lib/catalog";
import { Btn, Card, postJson, toast } from "./ui";
import { fmtDate, type AdminOrder } from "./types";

function toPlaced(o: AdminOrder): PlacedOrder {
  let items: PlacedOrder["items"] = [];
  try { items = JSON.parse(o.items_json); } catch { items = []; }
  return { ...o, items, slip: !!o.slip_key };
}

function OneTap({ phone, text }: { phone: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const p = normalizePhone(phone);
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`https://wa.me/${p}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="rounded-full bg-[#1FAF5A] px-4 py-2 text-sm font-semibold text-white">WhatsApp customer</a>
      <a href={`viber://chat?number=%2B${p}`} className="rounded-full bg-[#6F4BC8] px-4 py-2 text-sm font-semibold text-white">Open Viber</a>
      <button type="button" onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(true))} className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-tt-line">
        {copied ? "Copied" : "Copy message"}
      </button>
    </div>
  );
}

function OrderCard({ o, settings, onChange, canDelete }: { o: AdminOrder; settings: Settings; onChange: () => void; canDelete: boolean }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(o.admin_note ?? "");
  const [info, setInfo] = useState("");
  const placed = toPlaced(o);
  const st = statusOf(o.status);
  const waOn = settings.wa_phone_number_id && settings.wa_token_set === "1";

  async function setStatus(status: string) {
    setBusy(true);
    setInfo("");
    try {
      const d = await postJson({ kind: "order_status", code: o.code, status });
      if (status === "confirmed") toast(`${o.code} confirmed. It is now in Confirmed & delivery. ${d.notified ? "The customer got a WhatsApp confirmation." : waOn ? "Automatic WhatsApp failed, send it from the order card." : "Send the confirmation with the WhatsApp button on the order card."}`);
      else if (status === "cancelled") toast(`${o.code} declined.`);
      else if (status === "completed") toast(`${o.code} completed and closed.`);
      else toast(`${o.code} updated.`);
      onChange();
    } catch (e) { setInfo(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  }

  async function setDelivery(delivery: string) {
    setBusy(true);
    try {
      await postJson({ kind: "order_delivery", code: o.code, delivery });
      toast(`${o.code}: ${DELIVERY_STEPS.find((d) => d.id === delivery)?.label}`);
      onChange();
    } catch (e) { setInfo(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  }

  const msg = o.status === "pending" ? placedMessageForCustomer(placed) : confirmedMessageForCustomer(placed, settings);
  return (
    <article className={`rounded-3xl bg-white p-5 ring-1 sm:p-6 ${o.status === "pending" ? "ring-2 ring-tt-coral/60" : "ring-tt-line"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="tt-display text-xl font-bold">{o.code}</span>
        <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: st.tint }}>{st.label}</span>
        <span className="text-sm text-tt-soft">{fmtDate(o.created_at)}</span>
        {o.source === "shop" ? <span className="rounded-full bg-[#E7E0FF] px-3 py-1 text-xs font-bold text-[#4D3A86]">Shop order{o.created_by ? ` · ${o.created_by}` : ""}</span> : null}
        <span className="ml-auto tt-display text-xl font-bold">{mvr(o.total)}</span>
      </div>

      <div className="mt-4 grid gap-5 text-[14.5px] md:grid-cols-2">
        <div className="space-y-1">
          <p className="font-semibold">{o.name} {o.customer_id ? <span className="text-xs font-normal text-tt-soft">(account #{o.customer_id})</span> : null}</p>
          <p>+{normalizePhone(o.phone)}</p>
          <p className="text-tt-soft">{o.address}{o.island ? `, ${o.island}` : ""}</p>
          {o.notes ? <p className="italic text-tt-soft">"{o.notes}"</p> : null}
          {o.slip_checked ? (
            <p className="inline-flex flex-wrap items-center gap-1.5 rounded-full bg-tt-sage px-3 py-1 text-xs font-semibold text-tt-mintdeep" title="Read automatically from the slip at checkout. Check the money is in your account before confirming.">
              Slip auto-checked: {o.slip_bank} · {mvr(o.slip_amount ?? 0)}{o.slip_ref ? ` · Ref ${o.slip_ref}` : ""}{o.slip_date ? ` · ${o.slip_date}` : ""}
            </p>
          ) : null}
          <p>Payment: <b>{paymentLabel(o.payment)}</b>{o.slip_key ? <> · <a className="font-semibold text-tt-leaf underline" href={`/media/${o.slip_key}`} target="_blank" rel="noreferrer">View slip</a></> : o.payment === "bml" ? " · no slip yet" : ""}</p>
        </div>
        <div>
          <ul className="space-y-1">{placed.items.map((i, k) => (
            <li key={k}>
              <span className="flex justify-between gap-3"><span>{i.qty} x {i.bundle_items?.length ? "Bundle: " : ""}{i.name}</span><span>{mvr(i.price * i.qty)}</span></span>
              {i.bundle_items?.length ? <span className="block text-xs text-tt-soft">{i.bundle_items.map((b) => `${b.qty * i.qty} x ${b.name ?? b.id}`).join(" · ")}</span> : null}
              {i.batch_no || i.expiry ? <span className="block text-xs text-tt-soft">{i.batch_no ? `Batch ${i.batch_no}` : ""}{i.batch_no && i.expiry ? " · " : ""}{i.expiry ? `Exp ${i.expiry}` : ""}</span> : null}
            </li>
          ))}</ul>
          {o.points_discount ? <p className="mt-2 flex justify-between text-sm text-[#9A6A12]"><span>Bean Points ({o.points_used})</span><span>-{mvr(o.points_discount)}</span></p> : null}
          <p className="mt-2 flex justify-between border-t border-tt-line pt-2 text-sm text-tt-soft"><span>Delivery</span><span>{mvr(o.delivery)}</span></p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-tt-line pt-4">
        {o.status === "pending" ? (
          <>
            <Btn onClick={() => void setStatus("confirmed")} disabled={busy}>Confirm order</Btn>
            <Btn tone="danger" onClick={() => { if (window.confirm(`Decline order ${o.code}?`)) void setStatus("cancelled"); }} disabled={busy}>Decline</Btn>
          </>
        ) : o.status === "confirmed" ? (
          <div className="w-full space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-tt-soft">Delivery</p>
            <div className="grid grid-cols-3 gap-2">
              {DELIVERY_STEPS.map((d, i) => {
                const at = Math.max(0, DELIVERY_STEPS.findIndex((x) => x.id === (o.delivery_status || "preparing")));
                const done = i <= at;
                return (
                  <button key={d.id} type="button" disabled={busy} onClick={() => void setDelivery(d.id)}
                    className={`relative rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${done ? "bg-tt-leaf text-white" : "bg-tt-milk text-tt-soft ring-1 ring-tt-line hover:ring-tt-leaf"}`}>
                    <span className="block text-[11px] opacity-80">Step {i + 1}</span>{d.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Btn tone="ink" disabled={busy || o.delivery_status !== "delivered"} onClick={() => void setStatus("completed")}>Complete & close order</Btn>
              {o.delivery_status !== "delivered" ? <span className="text-xs text-tt-soft">Set delivery to Delivered to close the order.</span> : null}
              <button type="button" className="ml-auto text-xs font-semibold text-[#A3283F] hover:underline" onClick={() => { if (window.confirm(`Cancel confirmed order ${o.code}? Stock will be returned.`)) void setStatus("cancelled"); }}>Cancel order</button>
            </div>
          </div>
        ) : o.status === "completed" ? (
          <>
            <span className="rounded-full bg-[#CDEBFF] px-4 py-2 text-sm font-semibold">Closed {o.completed_at ? fmtDate(o.completed_at) : ""}</span>
            {canDelete ? (
              <Btn tone="danger" disabled={busy} onClick={async () => {
                if (!window.confirm(`Delete order ${o.code} permanently? It will be removed from orders and sales reports. This can't be undone.`)) return;
                setBusy(true);
                try { await postJson({ kind: "order_delete", code: o.code }); toast(`${o.code} deleted.`); onChange(); } catch (e) { setInfo(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
              }}>Delete order</Btn>
            ) : (
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-tt-milk px-3 py-2 text-xs font-semibold text-tt-soft" title="Only the Super Admin can delete orders">Delete: Super Admin only</span>
            )}
          </>
        ) : (
          <Btn tone="ghost" disabled={busy} onClick={() => void setStatus("pending")}>Move back to To confirm</Btn>
        )}
        {waOn && (o.status === "confirmed" || o.status === "completed") ? (
          <Btn tone="ghost" disabled={busy} onClick={async () => { setBusy(true); try { const d = await postJson({ kind: "order_notify", code: o.code, which: "confirmed" }); setInfo(d.notified ? "Confirmation re-sent on WhatsApp." : "Automatic send failed, use the buttons below."); onChange(); } catch (e) { setInfo(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); } }}>
            Re-send WhatsApp
          </Btn>
        ) : null}
      </div>
      {info ? <p className="mt-3 rounded-2xl bg-tt-sage px-4 py-2.5 text-sm font-semibold text-tt-mintdeep">{info}</p> : null}

      <div className="mt-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-tt-soft">Message the customer yourself</p>
        <OneTap phone={o.phone} text={msg} />
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 text-xs font-semibold text-tt-soft">Private note
            <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-xl bg-tt-milk px-3 py-2 text-sm font-normal text-tt-ink ring-1 ring-tt-line" placeholder="Only you can see this" />
          </label>
          {note !== (o.admin_note ?? "") ? <Btn tone="ghost" onClick={async () => { await postJson({ kind: "order_note", code: o.code, note }); onChange(); }}>Save note</Btn> : null}
        </div>
        {o.notify_log ? (
          <details className="text-xs text-tt-soft"><summary className="cursor-pointer font-semibold">Activity</summary><pre className="mt-2 whitespace-pre-wrap font-sans">{o.notify_log}</pre></details>
        ) : null}
      </div>
    </article>
  );
}

export type OrderView = "pending" | "confirmed" | "completed" | "cancelled";

export function OrdersPanel({ orders, settings, onChange, view, canDelete = false }: { orders: AdminOrder[]; settings: Settings; onChange: () => void; view: OrderView; canDelete?: boolean }) {
  const [sub, setSub] = useState("all");
  const [q, setQ] = useState("");
  const base = orders.filter((o) => o.status === view);
  const shown = base
    .filter((o) => view !== "confirmed" || sub === "all" || (o.delivery_status || "preparing") === sub)
    .filter((o) => !q || `${o.code} ${o.name} ${o.phone}`.toLowerCase().includes(q.toLowerCase()));
  const total = shown.reduce((s, o) => s + o.total, 0);
  const empty = {
    pending: "No orders waiting for confirmation. New orders appear here first.",
    confirmed: "No confirmed orders on the way. Confirmed orders wait here until they are delivered and closed.",
    completed: "No completed orders yet.",
    cancelled: "No cancelled orders.",
  }[view];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {view === "confirmed"
          ? [{ id: "all", label: "All" }, ...DELIVERY_STEPS].map((f) => (
              <button key={f.id} type="button" onClick={() => setSub(f.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${sub === f.id ? "bg-tt-ink text-white" : "bg-white ring-1 ring-tt-line"}`}>
                {f.label} ({f.id === "all" ? base.length : base.filter((o) => (o.delivery_status || "preparing") === f.id).length})
              </button>
            ))
          : null}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order, name, phone" className="ml-auto rounded-full bg-white px-4 py-2.5 text-sm ring-1 ring-tt-line" />
      </div>
      {shown.length && view !== "pending" ? <p className="text-sm text-tt-soft">{shown.length} orders · {mvr(total)}</p> : null}
      {shown.length ? shown.map((o) => <OrderCard key={o.code} o={o} settings={settings} onChange={onChange} canDelete={canDelete} />) : <Card><p className="text-center text-tt-soft">{empty}</p></Card>}
    </div>
  );
}
