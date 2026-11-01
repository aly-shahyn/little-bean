import { useEffect, useState, type ReactNode } from "react";

import { customerStep, mvr, type Customer } from "../../lib/catalog";
import type { MyOrder } from "../../lib/account";
import { IconCheck, IconClose, IconTruck } from "./icons";
import { field } from "./auth-forms";

export function Sheet({ open, onClose, title, tint, children }: { open: boolean; onClose: () => void; title: string; tint: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-tt-ink/35 p-0 sm:items-center sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="tt-rise max-h-[92dvh] w-full overflow-y-auto rounded-t-[32px] bg-white sm:max-w-lg sm:rounded-[32px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5" style={{ background: tint }}>
          <h2 className="tt-display text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/80" aria-label="Close"><IconClose size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function DetailsForm({ customer, onSaved }: { customer: Customer; onSaved: () => void }) {
  const [err, setErr] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget).entries());
        const r = await fetch("/api/account/me", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
        if (r.ok) onSaved();
        else setErr("Could not save. Please try again.");
      }}
    >
      <label className="block text-sm font-semibold">Your name<input name="name" required defaultValue={customer.name} className={field} /></label>
      <label className="block text-sm font-semibold">Area
        <select name="island" defaultValue={customer.island || "Male"} className={field}>
          {["Male", "Hulhumale", "Villimale", "Other island"].map((a) => <option key={a}>{a}</option>)}
          {customer.island && !["Male", "Hulhumale", "Villimale", "Other island"].includes(customer.island) ? <option>{customer.island}</option> : null}
        </select>
      </label>
      <label className="block text-sm font-semibold">Delivery address<input name="address" defaultValue={customer.address} className={field} /></label>
      <label className="block text-sm font-semibold">Email<input name="email" type="email" defaultValue={customer.email} className={field} /></label>
      <p className="text-xs text-tt-soft">Your phone number (+{customer.phone}) is your login. To change it, message us.</p>
      {err ? <p className="text-sm font-semibold text-[#8C2F45]">{err}</p> : null}
      <button type="submit" className="h-13 w-full rounded-2xl bg-tt-leaf py-3.5 font-semibold text-white">Save details</button>
    </form>
  );
}

export function PasswordForm({ onDone }: { onDone: () => void }) {
  const [msg, setMsg] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        if (f.get("next") !== f.get("next2")) return setMsg("The new passwords don't match.");
        const r = await fetch("/api/account/password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ current: f.get("current"), next: f.get("next") }) });
        const d = (await r.json()) as { ok: boolean; error?: string };
        if (d.ok) onDone();
        else setMsg(d.error || "Could not update password.");
      }}
    >
      <label className="block text-sm font-semibold">Current password<input name="current" type="password" required autoComplete="current-password" className={field} /></label>
      <label className="block text-sm font-semibold">New password<input name="next" type="password" required minLength={6} autoComplete="new-password" className={field} /></label>
      <label className="block text-sm font-semibold">Type it again<input name="next2" type="password" required minLength={6} autoComplete="new-password" className={field} /></label>
      {msg ? <p className="text-sm font-semibold text-[#8C2F45]">{msg}</p> : null}
      <button type="submit" className="w-full rounded-2xl bg-[#4D3A86] py-3.5 font-semibold text-white">Update password</button>
    </form>
  );
}



export function OrderStatusCard({ o }: { o: MyOrder }) {
  let items: { name: string; qty: number }[] = [];
  try { items = JSON.parse(o.items_json); } catch { items = []; }
  const { step, label } = customerStep(o.status, o.delivery_status);
  const date = new Date(o.created_at.replace(" ", "T") + "Z").toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const steps = ["Placed", "Confirmed", "Delivered"];
  return (
    <li className="tt-order-card">
      <div className="tt-order-top">
        <span className={`tt-order-status ${step < 0 ? "cancelled" : ""}`}>{step >= 2 ? <IconCheck size={13} /> : <IconTruck size={13} />}{label}</span>
        <span className="tt-display tt-order-total">{mvr(o.total)}</span>
      </div>
      <p className="tt-order-meta">{date} · {o.code}</p>
      <details className="tt-order-items">
        <summary>{items.reduce((n, i) => n + i.qty, 0)} items · View details</summary>
        <ul>{items.map((item, i) => <li key={i}><strong>{item.qty} ×</strong><span>{item.name}</span></li>)}</ul>
      </details>
      {step >= 0 ? <ol className="tt-order-progress" aria-label={`Order progress: ${label}`}>
        {steps.map((s, i) => <li key={s} className={i <= step ? "is-done" : ""} aria-current={i === step ? "step" : undefined}>
          <span className="tt-step-dot">{i <= step ? <IconCheck size={10} /> : null}</span>
          {i === 2 && label === "On the way" ? "On the way" : s}
        </li>)}
      </ol> : <p className="tt-order-meta">This order was cancelled.</p>}
    </li>
  );
}

/** Age in whole months from "YYYY-MM" or "YYYY-MM-DD". */
export function ageMonths(birth: string): number | null {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(birth);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3] || 1)];
  const now = new Date();
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - mo);
  if (now.getDate() < d) months -= 1;
  return Math.max(0, months);
}
export function ageGroup(months: number): string {
  if (months >= 12) return "12m+";
  if (months >= 9) return "9m+";
  if (months >= 7) return "7m+";
  return "6m+";
}
