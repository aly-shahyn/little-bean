import { useState } from "react";

import { fmtExpiry, mvr, type Product } from "../../../lib/catalog";
import { landedUnitCost, round2, weightedAverage } from "../../../lib/costing";
import { Btn, Card, inputCls, postJson, toast } from "./ui";
import { fmtDate, type StockMove } from "./types";

type Level = "out" | "low" | "ok" | "untracked";
export function stockLevel(p: Product): Level {
  if (p.stock === null || p.stock === undefined) return "untracked";
  if (p.stock <= 0) return "out";
  if (p.stock <= (p.low_stock ?? 5)) return "low";
  return "ok";
}
const LEVEL: Record<Level, { label: string; bg: string; ink: string; icon: string }> = {
  out: { label: "Out of stock", bg: "#FBE1E5", ink: "#A3283F", icon: "!" },
  low: { label: "Low", bg: "#FFE9A8", ink: "#7A5A0E", icon: "▲" },
  ok: { label: "In stock", bg: "#D8F3E3", ink: "#157A52", icon: "✓" },
  untracked: { label: "Not tracked", bg: "#EEF6EE", ink: "#5E6A64", icon: "–" },
};
const REASON: Record<string, string> = { received: "Received", adjust: "Adjusted", damaged: "Damaged / expired", returned: "Returned", sale: "Sold" };

function Tile({ label, value, sub, tint }: { label: string; value: string; sub?: string; tint: string }) {
  return (
    <div className="rounded-3xl p-5" style={{ background: tint }}>
      <p className="text-xs font-semibold uppercase tracking-wider text-tt-ink/60">{label}</p>
      <p className="tt-display mt-1 text-2xl font-extrabold">{value}</p>
      {sub ? <p className="text-xs text-tt-ink/60">{sub}</p> : null}
    </div>
  );
}

function moveCost(m: StockMove) {
  const avg = m.avg_after !== null && m.avg_after !== undefined && m.avg_after > 0 ? ` → avg ${mvr(m.avg_after)}` : "";
  if (m.reason === "received" && m.unit_cost) return <span>{`@ ${mvr(m.unit_cost)} landed${m.logistics ? ` (incl. ${mvr(m.logistics)} logistics)` : ""}${avg}`}</span>;
  if (m.reason === "sale" && m.unit_cost) return <span>{`at cost ${mvr(m.unit_cost)}/unit`}</span>;
  if (m.unit_cost) return <span>{`@ ${mvr(m.unit_cost)}/unit${avg}`}</span>;
  return <span>{avg ? avg.slice(3) : "—"}</span>;
}

function ReceiveForm({ p, busy, onSubmit }: { p: Product; busy: boolean; onSubmit: (body: Record<string, unknown>) => void }) {
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [logi, setLogi] = useState("");
  const [note, setNote] = useState("");
  const [expense, setExpense] = useState(true);
  const n = Math.max(0, Math.floor(Number(qty) || 0));
  const u = Math.max(0, Number(unit) || 0);
  const l = Math.max(0, Number(logi) || 0);
  const onHand = Math.max(0, p.stock ?? 0);
  const avg = p.cost_price ?? 0;
  const landed = landedUnitCost(u, l, n);
  const next = weightedAverage(onHand, avg, n, landed);
  const ready = n > 0 && landed > 0;
  return (
    <form className="mt-4 grid gap-3 rounded-2xl bg-tt-milk p-4 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ kind: "stock_move", id: p.id, reason: "received", qty: n, unit_cost: u, logistics: l, note, add_expense: expense }); }}>
      <label className="text-xs font-semibold">Units received<input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min={1} step={1} required className={inputCls} /></label>
      <label className="text-xs font-semibold">Product cost per unit (MVR)<input value={unit} onChange={(e) => setUnit(e.target.value)} type="number" min={0} step="0.01" placeholder="Supplier price" className={inputCls} /></label>
      <label className="text-xs font-semibold">Logistics for this shipment (MVR)<input value={logi} onChange={(e) => setLogi(e.target.value)} type="number" min={0} step="0.01" placeholder="Freight, duty, boat... total" className={inputCls} /></label>
      <div className="rounded-2xl bg-white p-4 text-sm ring-1 ring-tt-line sm:col-span-3">
        {ready ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-tt-soft">Landed cost / unit</p><p className="tt-display text-xl font-extrabold">{mvr(landed)}</p><p className="text-xs text-tt-soft">{mvr(u)} + {mvr(l)} ÷ {n}</p></div>
            <div><p className="text-xs font-semibold uppercase tracking-wider text-tt-soft">On the shelf now</p><p className="tt-display text-xl font-extrabold">{onHand} @ {avg ? mvr(avg) : "—"}</p><p className="text-xs text-tt-soft">{avg && onHand ? `worth ${mvr(onHand * avg)}` : "starts from this shipment"}</p></div>
            <div><p className="text-xs font-semibold uppercase tracking-wider text-tt-soft">New average cost</p><p className="tt-display text-xl font-extrabold text-tt-leafdeep">{mvr(next)}</p><p className="text-xs text-tt-soft">{onHand + n} units{avg && onHand ? ` · (${mvr(onHand * avg)} + ${mvr(n * landed)}) ÷ ${onHand + n}` : ""}</p></div>
          </div>
        ) : <p className="text-tt-soft">Enter units and cost to see the landed cost and the new average. Leave cost blank to add units without changing the average.</p>}
      </div>
      <label className="text-xs font-semibold sm:col-span-3">Note<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Supplier, invoice, batch..." className={inputCls} /></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input checked={expense} onChange={(e) => setExpense(e.target.checked)} type="checkbox" className="h-4 w-4 accent-[#1B8053]" /> Also record {ready ? mvr(round2(n * u + l)) : "this"} as a Stock purchase expense</label>
      <Btn type="submit" disabled={busy}>Add to stock</Btn>
    </form>
  );
}

function Row({ p, onChange }: { p: Product; onChange: () => void }) {
  const [open, setOpen] = useState<"" | "receive" | "adjust" | "settings">("");
  const [busy, setBusy] = useState(false);
  const lv = stockLevel(p);
  const L = LEVEL[lv];
  const cost = p.cost_price ?? 0;
  const margin = cost && p.price ? Math.round(((p.price - cost) / p.price) * 100) : null;

  async function send(body: Record<string, unknown>, msg: string) {
    setBusy(true);
    try { await postJson(body); toast(msg); setOpen(""); onChange(); }
    catch (e) { toast(e instanceof Error ? e.message : "Error"); }
    finally { setBusy(false); }
  }
  const val = (f: HTMLFormElement, k: string) => (f.elements.namedItem(k) as HTMLInputElement | null)?.value ?? "";
  const chk = (f: HTMLFormElement, k: string) => !!(f.elements.namedItem(k) as HTMLInputElement | null)?.checked;

  return (
    <li className="rounded-3xl bg-white p-4 ring-1 ring-tt-line">
      <div className="flex flex-wrap items-center gap-3">
        <img src={p.image} alt="" className="h-12 w-12 rounded-2xl bg-tt-milk object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{p.name}</p>
          <p className="text-xs text-tt-soft">{p.batch_no ? `Batch ${p.batch_no} · ` : ""}{p.expiry ? `Exp ${fmtExpiry(p.expiry)} · ` : ""}{p.sku ? `SKU ${p.sku} · ` : ""}{mvr(p.price)}{cost ? ` · avg cost ${mvr(cost)}` : " · no cost set"}{margin !== null ? ` · ${margin}% margin` : ""}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold" style={{ background: L.bg, color: L.ink }}>
          <span aria-hidden="true">{L.icon}</span>{lv === "untracked" ? L.label : `${p.stock} · ${L.label}`}
        </span>
        <div className="flex gap-1.5">
          <Btn tone={open === "receive" ? "ink" : "ghost"} onClick={() => setOpen(open === "receive" ? "" : "receive")}>Receive</Btn>
          <Btn tone={open === "adjust" ? "ink" : "ghost"} onClick={() => setOpen(open === "adjust" ? "" : "adjust")}>Adjust</Btn>
          <Btn tone={open === "settings" ? "ink" : "ghost"} onClick={() => setOpen(open === "settings" ? "" : "settings")}>Settings</Btn>
        </div>
      </div>

      {open === "receive" ? <ReceiveForm p={p} busy={busy} onSubmit={(body) => void send(body, `Stock received for ${p.name}`)} /> : null}

      {open === "adjust" ? (
        <form className="mt-4 grid gap-3 rounded-2xl bg-tt-milk p-4 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; void send({ kind: "stock_move", id: p.id, reason: val(f, "reason"), qty: val(f, "qty"), note: val(f, "note") }, `Stock updated for ${p.name}`); }}>
          <label className="text-xs font-semibold">Reason
            <select name="reason" className={inputCls}>
              <option value="damaged">Damaged / expired (remove)</option>
              <option value="returned">Returned by customer (add)</option>
              <option value="adjust">Correction (+ or -)</option>
            </select>
          </label>
          <label className="text-xs font-semibold">Units<input name="qty" type="number" required className={inputCls} placeholder="e.g. 2 or -2" /></label>
          <label className="text-xs font-semibold sm:col-span-2">Note<input name="note" className={inputCls} /></label>
          <div className="sm:col-span-4"><Btn type="submit" disabled={busy}>Save change</Btn></div>
        </form>
      ) : null}

      {open === "settings" ? (
        <form className="mt-4 grid gap-3 rounded-2xl bg-tt-milk p-4 sm:grid-cols-5" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; void send({ kind: "inventory_save", id: p.id, track: chk(f, "track"), stock: val(f, "stock"), sku: val(f, "sku"), cost_price: val(f, "cost_price"), low_stock: val(f, "low_stock"), batch_no: val(f, "batch_no"), expiry: val(f, "expiry") }, `Saved ${p.name}`); }}>
          <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-5"><input name="track" type="checkbox" defaultChecked={lv !== "untracked"} className="h-4 w-4 accent-[#1B8053]" /> Track stock for this product (sells out automatically at 0)</label>
          <label className="text-xs font-semibold">Units in stock<input name="stock" type="number" min={0} defaultValue={p.stock ?? 0} className={inputCls} /></label>
          <label className="text-xs font-semibold">SKU / code<input name="sku" defaultValue={p.sku ?? ""} className={inputCls} /></label>
          <label className="text-xs font-semibold">Average cost (MVR)<input name="cost_price" type="number" min={0} step="0.01" defaultValue={cost ? round2(cost) : ""} className={inputCls} title="Worked out automatically from each shipment. Only change it to correct a mistake." /></label>
          <label className="text-xs font-semibold">Low stock alert at<input name="low_stock" type="number" min={0} defaultValue={p.low_stock ?? 5} className={inputCls} /></label>
          <label className="text-xs font-semibold sm:col-span-2">Batch no. (shown at checkout)<input name="batch_no" defaultValue={p.batch_no ?? ""} placeholder="e.g. LF240915" className={inputCls} /></label>
          <label className="text-xs font-semibold sm:col-span-2">Best before / expiry<input name="expiry" type="date" defaultValue={p.expiry && p.expiry.length === 7 ? `${p.expiry}-01` : (p.expiry ?? "")} className={inputCls} /></label>
          <div className="flex items-end"><Btn type="submit" disabled={busy}>Save</Btn></div>
        </form>
      ) : null}
    </li>
  );
}

export function InventoryPanel({ products, moves, onChange }: { products: Product[]; moves: StockMove[]; onChange: () => void }) {
  const [f, setF] = useState<"all" | Level>("all");
  const [q, setQ] = useState("");
  const tracked = products.filter((p) => stockLevel(p) !== "untracked");
  const units = tracked.reduce((s, p) => s + Math.max(0, p.stock ?? 0), 0);
  const atCost = tracked.reduce((s, p) => s + Math.max(0, p.stock ?? 0) * (p.cost_price ?? 0), 0);
  const atRetail = tracked.reduce((s, p) => s + Math.max(0, p.stock ?? 0) * p.price, 0);
  const low = products.filter((p) => stockLevel(p) === "low").length;
  const out = products.filter((p) => stockLevel(p) === "out").length;
  const order: Record<Level, number> = { out: 0, low: 1, ok: 2, untracked: 3 };
  const shown = products
    .filter((p) => f === "all" || stockLevel(p) === f)
    .filter((p) => !q || `${p.name} ${p.sku ?? ""} ${p.brand}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => order[stockLevel(a)] - order[stockLevel(b)] || a.name.localeCompare(b.name));
  const chips: { id: "all" | Level; label: string; n: number }[] = [
    { id: "all", label: "All", n: products.length },
    { id: "out", label: "Out of stock", n: out },
    { id: "low", label: "Low", n: low },
    { id: "ok", label: "In stock", n: products.filter((p) => stockLevel(p) === "ok").length },
    { id: "untracked", label: "Not tracked", n: products.length - tracked.length },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Tracked products" value={`${tracked.length}/${products.length}`} tint="#E7E0FF" />
        <Tile label="Units in stock" value={units.toLocaleString()} tint="#D8F3E3" />
        <Tile label="Stock value (cost)" value={mvr(atCost)} sub={`Retail value ${mvr(atRetail)}`} tint="#FFE9A8" />
        <Tile label="Low stock" value={String(low)} tint="#FFD6C7" />
        <Tile label="Out of stock" value={String(out)} tint="#FFDDE6" />
      </div>
      {tracked.length === 0 ? (
        <Card className="bg-tt-butter/40"><p className="text-sm"><b>Start tracking stock:</b> open <b>Settings</b> on a product, tick "Track stock", and enter how many you have. When you confirm an order, the items are taken out of stock automatically. Cancelling puts them back.</p></Card>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((c) => (
          <button key={c.id} type="button" onClick={() => setF(c.id)} className={`rounded-full px-4 py-2 text-sm font-semibold ${f === c.id ? "bg-tt-ink text-white" : "bg-white ring-1 ring-tt-line"}`}>{c.label} ({c.n})</button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product or SKU" className="ml-auto rounded-full bg-white px-4 py-2.5 text-sm ring-1 ring-tt-line" />
      </div>
      <ul className="space-y-2">{shown.map((p) => <Row key={p.id} p={p} onChange={onChange} />)}</ul>

      <Card>
        <h3 className="tt-display text-lg font-bold">Recent stock movements</h3>
        {moves.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-tt-soft"><tr><th className="py-2">When</th><th>Product</th><th>Change</th><th>Reason</th><th>Cost</th></tr></thead>
              <tbody>
                {moves.slice(0, 60).map((m) => (
                  <tr key={m.id} className="border-t border-tt-line">
                    <td className="py-2 pr-3 text-tt-soft">{fmtDate(m.created_at)}</td>
                    <td className="pr-3 font-semibold">{m.product_name ?? m.product_id}</td>
                    <td className={`pr-3 font-bold ${m.change < 0 ? "text-[#A3283F]" : "text-tt-leafdeep"}`}>{m.change > 0 ? `+${m.change}` : m.change}</td>
                    <td className="pr-3">{REASON[m.reason] ?? m.reason}</td>
                    <td className="text-tt-soft">{moveCost(m)}{m.note ? <span className="block text-xs">{m.note}</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-2 text-sm text-tt-soft">No stock movements yet.</p>}
      </Card>
    </div>
  );
}
