import { mvr } from "../../../lib/catalog";
import { GroupedBars, HBars, REV, Sparkline } from "./charts";
import { stockLevel } from "./inventory";
import { monthly, periodStart, stats, topProducts } from "./money";
import { fmtDate, type AdminData } from "./types";

export type Section =
  | "dashboard" | "new_order" | "pending" | "confirmed" | "completed" | "cancelled" | "customers"
  | "products" | "inventory" | "bundles" | "lists" | "sales" | "expenses" | "content" | "settings" | "team";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function Dashboard({ d, go }: { d: AdminData; go: (s: Section) => void }) {
  const pending = d.orders.filter((o) => o.status === "pending");
  const confirmed = d.orders.filter((o) => o.status === "confirmed");
  const ds = (o: (typeof confirmed)[number]) => o.delivery_status || "preparing";
  const month = stats(d, periodStart("month"));
  const series = monthly(d, 6);
  const newCustomers = d.customers.filter((c) => c.created_at.slice(0, 7) === new Date().toISOString().slice(0, 7)).length;
  const waitingCustomers = d.customers.filter((c) => c.status === "pending");
  const alerts = d.products.filter((p) => ["out", "low"].includes(stockLevel(p))).sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
  const tracked = d.products.filter((p) => stockLevel(p) !== "untracked").length;
  const samples = d.products.filter((p) => p.image.startsWith("/assets/samples")).length;
  const estimated = d.products.filter((p) => !p.price_confirmed).length;
  const noCost = d.products.filter((p) => !p.cost_price).length;
  const ownerOn = d.settings.callmebot_set === "1" || (!!d.settings.wa_tpl_admin && d.settings.wa_token_set === "1");
  const waOn = !!d.settings.wa_phone_number_id && d.settings.wa_token_set === "1";

  const pipe: { label: string; n: number; go: Section; tint: string; ink: string }[] = [
    { label: "To confirm", n: pending.length, go: "pending", tint: "#FFD6C7", ink: "#8A3B22" },
    { label: "Preparing", n: confirmed.filter((o) => ds(o) === "preparing").length, go: "confirmed", tint: "#FFE9A8", ink: "#7A5A0E" },
    { label: "Out for delivery", n: confirmed.filter((o) => ds(o) === "out_for_delivery").length, go: "confirmed", tint: "#E7E0FF", ink: "#4D3A86" },
    { label: "Delivered, to close", n: confirmed.filter((o) => ds(o) === "delivered").length, go: "confirmed", tint: "#CDEBFF", ink: "#1F5873" },
    { label: "Completed this month", n: month.done.length, go: "completed", tint: "#D8F3E3", ink: "#157A52" },
  ];

  const todo: { text: string; go: Section }[] = [
    ...(!ownerOn ? [{ text: "Turn on WhatsApp alerts for new orders", go: "settings" as Section }] : []),
    ...(!waOn ? [{ text: "Connect automatic WhatsApp messages to customers", go: "settings" as Section }] : []),
    ...(!tracked ? [{ text: "Start tracking stock in Inventory", go: "inventory" as Section }] : []),
    ...(noCost ? [{ text: `${noCost} products have no cost price (needed for profit)`, go: "inventory" as Section }] : []),
    ...(samples ? [{ text: `${samples} products still use a sample photo`, go: "products" as Section }] : []),
    ...(estimated ? [{ text: `${estimated} product prices are estimates, please confirm`, go: "products" as Section }] : []),
  ];

  const kpis = [
    { label: "Revenue this month", value: mvr(month.revenue), spark: series.map((m) => m.a), go: "sales" as Section },
    { label: "Net profit this month", value: mvr(month.net), spark: series.map((m) => m.a - m.b), go: "sales" as Section },
    { label: "Orders completed", value: String(month.done.length), sub: `Avg ${mvr(month.aov)}`, go: "completed" as Section },
    { label: "Customers", value: String(d.customers.length), sub: `${newCustomers} new this month`, go: "customers" as Section },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(120deg,#13663F_0%,#1B8053_55%,#5E8C6F_100%)] p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute bottom-[-40px] right-32 h-28 w-28 rounded-full bg-tt-butter/20" />
        <p className="text-sm font-semibold text-white/70">{greeting()}</p>
        <h2 className="tt-display mt-1 text-2xl font-extrabold sm:text-3xl">
          {pending.length ? `${pending.length} order${pending.length === 1 ? "" : "s"} waiting for you` : "All orders are handled"}
        </h2>
        <p className="mt-1 text-white/75">{confirmed.length} on their way to families · {mvr(month.pipeline)} still to be delivered</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {pending.length ? <button type="button" onClick={() => go("pending")} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-tt-leafdeep">Confirm orders</button> : null}
          {waitingCustomers.length ? <button type="button" onClick={() => go("customers")} className="rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold">{waitingCustomers.length} new sign-up{waitingCustomers.length === 1 ? "" : "s"} to approve</button> : null}
          {alerts.length ? <button type="button" onClick={() => go("inventory")} className="rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold">{alerts.length} stock alert{alerts.length === 1 ? "" : "s"}</button> : null}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <button key={k.label} type="button" onClick={() => go(k.go)} className="rounded-3xl bg-white p-5 text-left ring-1 ring-tt-line transition-transform hover:-translate-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-tt-soft">{k.label}</p>
            <p className="tt-display mt-1 text-2xl font-extrabold">{k.value}</p>
            {k.spark ? <div className="mt-1"><Sparkline values={k.spark.map((v) => Math.max(0, v))} color={REV} /></div> : <p className="mt-1 text-xs text-tt-soft">{k.sub}</p>}
          </button>
        ))}
      </div>

      <section className="rounded-3xl bg-white p-5 ring-1 ring-tt-line sm:p-6">
        <h3 className="tt-display text-lg font-bold">Order journey</h3>
        <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {pipe.map((p, i) => (
            <li key={p.label} className="relative">
              <button type="button" onClick={() => go(p.go)} className="w-full rounded-2xl p-4 text-left transition hover:-translate-y-0.5" style={{ background: p.tint, color: p.ink }}>
                <span className="text-[11px] font-bold uppercase tracking-wider">Step {i + 1}</span>
                <span className="tt-display block text-3xl font-extrabold">{p.n}</span>
                <span className="block text-sm font-semibold">{p.label}</span>
              </button>
              {i < pipe.length - 1 ? <span className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-tt-soft sm:block" aria-hidden="true">›</span> : null}
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-3xl bg-white p-5 ring-1 ring-tt-line sm:p-6">
          <div className="flex items-center justify-between"><h3 className="tt-display text-lg font-bold">Last 6 months</h3><button type="button" onClick={() => go("sales")} className="text-sm font-semibold text-tt-leaf underline">Sales & reports</button></div>
          <div className="mt-3"><GroupedBars data={series} /></div>
        </section>
        <section className="rounded-3xl bg-white p-5 ring-1 ring-tt-line sm:p-6">
          <div className="flex items-center justify-between"><h3 className="tt-display text-lg font-bold">Stock alerts</h3><button type="button" onClick={() => go("inventory")} className="text-sm font-semibold text-tt-leaf underline">Inventory</button></div>
          {alerts.length ? (
            <ul className="mt-3 space-y-2">
              {alerts.slice(0, 7).map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-tt-milk px-3 py-2 text-sm">
                  <img src={p.image} alt="" className="h-8 w-8 rounded-xl object-cover" />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${(p.stock ?? 0) <= 0 ? "bg-[#FBE1E5] text-[#A3283F]" : "bg-tt-butter text-[#7A5A0E]"}`}>{(p.stock ?? 0) <= 0 ? "! Out" : `▲ ${p.stock} left`}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-tt-soft">{tracked ? "Everything is well stocked." : "Stock is not tracked yet. Turn it on per product in Inventory."}</p>}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-3xl bg-white p-5 ring-1 ring-tt-line sm:p-6">
          <h3 className="tt-display mb-4 text-lg font-bold">Best sellers this month</h3>
          <HBars rows={topProducts(month.done, d.products, 5)} empty="No completed orders this month yet." />
        </section>
        <section className="rounded-3xl bg-white p-5 ring-1 ring-tt-line sm:p-6">
          <div className="flex items-center justify-between"><h3 className="tt-display text-lg font-bold">To confirm</h3><button type="button" onClick={() => go("pending")} className="text-sm font-semibold text-tt-leaf underline">Open</button></div>
          {pending.length ? (
            <ul className="mt-3 divide-y divide-tt-line">
              {pending.slice(0, 5).map((o) => (
                <li key={o.code} className="flex items-center gap-3 py-2.5 text-sm"><span className="font-bold">{o.code}</span><span className="truncate text-tt-soft">{o.name}</span><span className="ml-auto font-semibold">{mvr(o.total)}</span></li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-tt-soft">All caught up.</p>}
        </section>
        <section className="rounded-3xl bg-white p-5 ring-1 ring-tt-line sm:p-6">
          <h3 className="tt-display text-lg font-bold">Set-up checklist</h3>
          {todo.length ? (
            <ul className="mt-3 space-y-2">
              {todo.map((t) => (
                <li key={t.text}><button type="button" onClick={() => go(t.go)} className="flex w-full items-center gap-3 rounded-2xl bg-tt-milk px-4 py-2.5 text-left text-sm font-medium hover:bg-tt-butter"><span className="h-2 w-2 shrink-0 rounded-full bg-tt-coral" />{t.text}</button></li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-tt-soft">Everything is set up.</p>}
          {waitingCustomers.length ? <p className="mt-4 text-sm text-tt-soft">Newest sign-up: <b>{waitingCustomers[0].name}</b>, {fmtDate(waitingCustomers[0].created_at)}</p> : null}
        </section>
      </div>
    </div>
  );
}
