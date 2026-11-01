import { useState } from "react";

import { EXPENSE_CATEGORIES, mvr, type Category, type Product } from "../../../lib/catalog";
import { Btn, Card, inputCls, postJson, toast } from "./ui";
import { EXP, GroupedBars, HBars, REV, type MonthPoint } from "./charts";
import { orderItems, revenueDate, type AdminData, type AdminOrder, type Expense } from "./types";

export type Period = "month" | "3m" | "year" | "all";
const PERIODS: { id: Period; label: string }[] = [
  { id: "month", label: "This month" },
  { id: "3m", label: "Last 3 months" },
  { id: "year", label: "This year" },
  { id: "all", label: "All time" },
];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export function periodStart(p: Period): string {
  const n = new Date();
  if (p === "month") return ymd(new Date(Date.UTC(n.getFullYear(), n.getMonth(), 1)));
  if (p === "3m") return ymd(new Date(Date.UTC(n.getFullYear(), n.getMonth() - 2, 1)));
  if (p === "year") return `${n.getFullYear()}-01-01`;
  return "0000-01-01";
}

export function lastMonths(n: number): { key: string; label: string }[] {
  const now = new Date();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1));
    out.push({ key: d.toISOString().slice(0, 7), label: `${MON[d.getUTCMonth()]}${n > 12 || d.getUTCMonth() === 0 ? ` ${String(d.getUTCFullYear()).slice(2)}` : ""}` });
  }
  return out;
}

export function monthly(d: AdminData, n: number): MonthPoint[] {
  const done = d.orders.filter((o) => o.status === "completed");
  return lastMonths(n).map((m) => ({
    ...m,
    a: done.filter((o) => revenueDate(o).startsWith(m.key)).reduce((s, o) => s + o.total, 0),
    b: d.expenses.filter((e) => e.spent_on.startsWith(m.key)).reduce((s, e) => s + e.amount, 0),
  }));
}

export function stats(d: AdminData, from: string) {
  const done = d.orders.filter((o) => o.status === "completed" && revenueDate(o).slice(0, 10) >= from);
  const revenue = done.reduce((s, o) => s + o.total, 0);
  const cogs = done.reduce((s, o) => s + (o.cogs || 0), 0);
  const noCost = done.filter((o) => !o.cogs).length;
  const exps = d.expenses.filter((e) => e.spent_on >= from);
  const stockBuys = exps.filter((e) => e.category === "Stock purchase").reduce((s, e) => s + e.amount, 0);
  const opex = exps.filter((e) => e.category !== "Stock purchase").reduce((s, e) => s + e.amount, 0);
  const gross = revenue - cogs;
  const pipeline = d.orders.filter((o) => o.status === "confirmed").reduce((s, o) => s + o.total, 0);
  return { done, revenue, cogs, noCost, exps, stockBuys, opex, gross, net: gross - opex, pipeline, aov: done.length ? Math.round(revenue / done.length) : 0 };
}

export function topProducts(done: AdminOrder[], products: Product[], n = 6) {
  const m = new Map<string, { label: string; value: number; qty: number }>();
  for (const o of done)
    for (const it of orderItems(o)) {
      const cur = m.get(it.id) ?? { label: products.find((p) => p.id === it.id)?.name ?? it.name, value: 0, qty: 0 };
      cur.value += it.price * it.qty;
      cur.qty += it.qty;
      m.set(it.id, cur);
    }
  return [...m.values()].sort((a, b) => b.value - a.value).slice(0, n).map((r) => ({ label: r.label, value: r.value, sub: `${r.qty} sold` }));
}

function byCategory(done: AdminOrder[], products: Product[], cats: Category[]) {
  const m = new Map<string, number>();
  for (const o of done)
    for (const it of orderItems(o)) {
      const c = products.find((p) => p.id === it.id)?.category ?? "other";
      m.set(c, (m.get(c) ?? 0) + it.price * it.qty);
    }
  return [...m.entries()].map(([k, v]) => ({ label: cats.find((c) => c.id === k)?.name ?? k, value: v })).sort((a, b) => b.value - a.value);
}

function expenseByCat(exps: Expense[]) {
  const m = new Map<string, number>();
  for (const e of exps) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function Kpi({ label, value, sub, tint, strong }: { label: string; value: string; sub?: string; tint: string; strong?: boolean }) {
  return (
    <div className={`rounded-3xl p-5 ${strong ? "ring-2 ring-tt-ink/10" : ""}`} style={{ background: tint }}>
      <p className="text-xs font-semibold uppercase tracking-wider text-tt-ink/60">{label}</p>
      <p className="tt-display mt-1 text-2xl font-extrabold">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-tt-ink/60">{sub}</p> : null}
    </div>
  );
}

export function SalesPanel({ d }: { d: AdminData }) {
  const [period, setPeriod] = useState<Period>("month");
  const s = stats(d, periodStart(period));
  const months = period === "year" ? new Date().getMonth() + 1 : period === "all" ? 12 : 6;
  const margin = s.revenue ? Math.round((s.gross / s.revenue) * 100) : 0;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button key={p.id} type="button" onClick={() => setPeriod(p.id)} className={`rounded-full px-4 py-2 text-sm font-semibold ${period === p.id ? "bg-tt-ink text-white" : "bg-white ring-1 ring-tt-line"}`}>{p.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Revenue" value={mvr(s.revenue)} sub={`${s.done.length} completed orders`} tint="#D8F3E3" strong />
        <Kpi label="Gross profit" value={mvr(s.gross)} sub={`${margin}% margin after product cost`} tint="#FFE9A8" />
        <Kpi label="Expenses" value={mvr(s.opex + s.stockBuys)} sub={`${mvr(s.stockBuys)} of it stock purchases`} tint="#E7E0FF" />
        <Kpi label="Net profit" value={mvr(s.net)} sub="Gross profit minus running costs" tint={s.net >= 0 ? "#CDEBFF" : "#FBE1E5"} strong />
        <Kpi label="Product cost (COGS)" value={mvr(s.cogs)} tint="#FFFFFF" />
        <Kpi label="Average order" value={mvr(s.aov)} tint="#FFFFFF" />
        <Kpi label="Confirmed, not delivered" value={mvr(s.pipeline)} sub="Revenue on the way" tint="#FFFFFF" />
        <Kpi label="Running costs" value={mvr(s.opex)} sub="Expenses except stock purchases" tint="#FFFFFF" />
      </div>
      {s.noCost ? <p className="rounded-2xl bg-tt-butter/60 px-4 py-3 text-sm">{s.noCost} completed order{s.noCost === 1 ? " has" : "s have"} no product cost recorded, so profit may look higher than it is. Set cost prices in <b>Inventory</b>; new orders pick them up when you confirm them.</p> : null}

      <Card>
        <h3 className="tt-display text-lg font-bold">Revenue vs expenses by month</h3>
        <p className="text-sm text-tt-soft">Revenue is counted when an order is completed. Expenses include stock purchases.</p>
        <div className="mt-4"><GroupedBars data={monthly(d, months)} /></div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card><h3 className="tt-display mb-4 text-lg font-bold">Best sellers</h3><HBars rows={topProducts(s.done, d.products)} color={REV} empty="No completed orders in this period." /></Card>
        <Card><h3 className="tt-display mb-4 text-lg font-bold">Revenue by category</h3><HBars rows={byCategory(s.done, d.products, d.categories)} color={REV} empty="No completed orders in this period." /></Card>
        <Card><h3 className="tt-display mb-4 text-lg font-bold">Expenses by category</h3><HBars rows={expenseByCat(s.exps)} color={EXP} empty="No expenses in this period." /></Card>
      </div>
    </div>
  );
}

function ExpenseForm({ e, onDone }: { e?: Expense; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[150px_180px_1fr_140px_auto] lg:items-end"
      onSubmit={async (ev) => {
        ev.preventDefault();
        const f = new FormData(ev.currentTarget);
        setBusy(true);
        try {
          await postJson({ kind: "expense_save", id: e?.id, spent_on: f.get("spent_on"), category: f.get("category"), description: f.get("description"), amount: f.get("amount") });
          toast(e ? "Expense updated" : "Expense added");
          if (!e) (ev.target as HTMLFormElement).reset();
          onDone();
        } catch (err) { toast(err instanceof Error ? err.message : "Error"); } finally { setBusy(false); }
      }}
    >
      <label className="text-xs font-semibold">Date<input name="spent_on" type="date" required defaultValue={e?.spent_on ?? new Date().toISOString().slice(0, 10)} className={inputCls} /></label>
      <label className="text-xs font-semibold">Category<select name="category" defaultValue={e?.category ?? "Delivery"} className={inputCls}>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label className="text-xs font-semibold">What for<input name="description" defaultValue={e?.description} placeholder="e.g. Delivery boy, Instagram ads" className={inputCls} /></label>
      <label className="text-xs font-semibold">Amount (MVR)<input name="amount" type="number" min={0.01} step="0.01" required defaultValue={e?.amount} className={inputCls} /></label>
      <Btn type="submit" disabled={busy}>{e ? "Save" : "Add expense"}</Btn>
    </form>
  );
}

export function ExpensesPanel({ expenses, onChange }: { expenses: Expense[]; onChange: () => void }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [edit, setEdit] = useState<number | null>(null);
  const monthsWith = [...new Set([new Date().toISOString().slice(0, 7), ...expenses.map((e) => e.spent_on.slice(0, 7))])].sort().reverse();
  const shown = expenses.filter((e) => month === "all" || e.spent_on.startsWith(month));
  const total = shown.reduce((s, e) => s + e.amount, 0);
  return (
    <div className="space-y-6">
      <Card><h3 className="tt-display mb-4 text-lg font-bold">Add an expense</h3><ExpenseForm onDone={onChange} /></Card>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="tt-display text-lg font-bold">Expenses</h3>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="ml-auto rounded-full bg-tt-milk px-4 py-2 text-sm font-semibold ring-1 ring-tt-line" aria-label="Month">
              <option value="all">All time</option>
              {monthsWith.map((m) => <option key={m} value={m}>{MON[Number(m.slice(5)) - 1]} {m.slice(0, 4)}</option>)}
            </select>
          </div>
          <p className="mt-1 text-sm text-tt-soft">{shown.length} entries · <b className="text-tt-ink">{mvr(total)}</b></p>
          {shown.length ? (
            <ul className="mt-4 divide-y divide-tt-line">
              {shown.map((e) => (
                <li key={e.id} className="py-3">
                  {edit === e.id ? (
                    <div className="space-y-2"><ExpenseForm e={e} onDone={() => { setEdit(null); onChange(); }} /><button type="button" onClick={() => setEdit(null)} className="text-xs font-semibold text-tt-soft">Cancel</button></div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="w-24 text-tt-soft">{e.spent_on}</span>
                      <span className="rounded-full bg-tt-lilac px-2.5 py-0.5 text-xs font-semibold text-[#4D3A86]">{e.category}</span>
                      <span className="min-w-0 flex-1 truncate">{e.description}</span>
                      <b>{mvr(e.amount)}</b>
                      <button type="button" onClick={() => setEdit(e.id)} className="text-xs font-semibold text-tt-leaf hover:underline">Edit</button>
                      <button type="button" onClick={async () => { if (!window.confirm("Delete this expense?")) return; await postJson({ kind: "expense_delete", id: e.id }); toast("Expense deleted"); onChange(); }} className="text-xs font-semibold text-[#A3283F] hover:underline">Delete</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-tt-soft">No expenses for this month yet.</p>}
        </Card>
        <Card><h3 className="tt-display mb-4 text-lg font-bold">By category</h3><HBars rows={expenseByCat(shown)} color={EXP} empty="Nothing yet." /></Card>
      </div>
    </div>
  );
}
