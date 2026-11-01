import { useMemo, useState } from "react";

import { BUNDLE_PREFIX, bundleItems, mvr, normalizePhone, pointsRules, type Product } from "../../../lib/catalog";
import { IconCheck, IconClose, IconMinus, IconPlus, IconSearch } from "../icons";
import type { Section } from "./dashboard";
import { Btn, Card, inputCls, postJson, toast } from "./ui";
import type { AdminCustomer, AdminData } from "./types";

type Line = { id: string; qty: number };
type After = "pending" | "confirmed" | "completed";
const PAYMENTS = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "bml", label: "BML transfer" },
];
const AFTER: { id: After; label: string; hint: string }[] = [
  { id: "pending", label: "Keep in To confirm", hint: "Check it later, nothing leaves stock yet." },
  { id: "confirmed", label: "Confirm now", hint: "Takes the items out of stock and moves it to delivery." },
  { id: "completed", label: "Paid & handed over", hint: "Confirms, marks delivered and completes it in one go." },
];
const pill = (on: boolean) => `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${on ? "bg-tt-ink text-white" : "bg-white ring-1 ring-tt-line hover:ring-tt-ink/40"}`;

export function NewOrderPanel({ d, onCreated }: { d: AdminData; onCreated: (tab: Section) => Promise<void> | void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [cart, setCart] = useState<Line[]>([]);
  const [cust, setCust] = useState<AdminCustomer | null>(null);
  const [custQ, setCustQ] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [nc, setNc] = useState({ phone: "", name: "" });
  const [fulfil, setFulfil] = useState<"delivery" | "pickup">("delivery");
  const [island, setIsland] = useState("");
  const [address, setAddress] = useState("");
  const [fee, setFee] = useState(String(Math.max(0, Math.floor(Number(d.settings.delivery_fee) || 0))));
  const [payment, setPayment] = useState("cash");
  const [notes, setNotes] = useState("");
  const [usePoints, setUsePoints] = useState(false);
  const [after, setAfter] = useState<After>("confirmed");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const products = d.products.filter((p) => !p.hidden);
  const bundles = (d.bundles ?? []).filter((b) => b.active);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Units of each product already in the order (bundles count their products), for live stock limits.
  const inCart = new Map<string, number>();
  for (const l of cart) {
    if (l.id.startsWith(BUNDLE_PREFIX)) {
      const b = bundles.find((x) => x.id === l.id.slice(BUNDLE_PREFIX.length));
      for (const bi of b ? bundleItems(b) : []) inCart.set(bi.id, (inCart.get(bi.id) ?? 0) + bi.qty * l.qty);
    } else inCart.set(l.id, (inCart.get(l.id) ?? 0) + l.qty);
  }
  const left = (p: Product) => (p.stock === null || p.stock === undefined ? Infinity : p.stock - (inCart.get(p.id) ?? 0));
  const canAdd = (id: string) => {
    if (!id.startsWith(BUNDLE_PREFIX)) { const p = byId.get(id); return !!p && !!p.in_stock && left(p) > 0; }
    const b = bundles.find((x) => x.id === id.slice(BUNDLE_PREFIX.length));
    return !!b && bundleItems(b).every((bi) => { const p = byId.get(bi.id); return !!p && !!p.in_stock && left(p) >= bi.qty; });
  };
  const add = (id: string) => { if (!canAdd(id)) return; setCart((c) => (c.some((l) => l.id === id) ? c.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l)) : [...c, { id, qty: 1 }])); };
  const dec = (id: string) => setCart((c) => c.flatMap((l) => (l.id !== id ? [l] : l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : [])));
  const lineInfo = (id: string) => {
    if (id.startsWith(BUNDLE_PREFIX)) { const b = bundles.find((x) => x.id === id.slice(BUNDLE_PREFIX.length)); return { name: b ? `Bundle: ${b.name}` : id, price: b?.price ?? 0, image: b?.image ?? "" }; }
    const p = byId.get(id); return { name: p?.name ?? id, price: p?.price ?? 0, image: p?.image ?? "" };
  };

  const shown = cat === "bundles" ? [] : products
    .filter((p) => cat === "all" || p.category === cat)
    .filter((p) => !q || `${p.name} ${p.brand} ${p.sku ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const shownBundles = cat === "all" || cat === "bundles" ? bundles.filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase())) : [];

  // Customer
  const matches = custQ.trim().length < 2 ? [] : d.customers.filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(custQ.trim().toLowerCase().replace(/^\+/, ""))).slice(0, 6);
  const typedPhone = normalizePhone(nc.phone);
  const existing = isNew && typedPhone.length >= 10 ? d.customers.find((c) => normalizePhone(c.phone) === typedPhone) : undefined;
  const pick = (c: AdminCustomer) => { setCust(c); setIsNew(false); setCustQ(""); setAddress(c.address || ""); setIsland(c.island || ""); setUsePoints(false); };

  // Totals, same rules as the website checkout
  const subtotal = cart.reduce((s, l) => s + lineInfo(l.id).price * l.qty, 0);
  const rules = pointsRules(d.settings);
  const bal = cust?.points ?? 0;
  const usable = Math.min(bal, Math.floor(subtotal / rules.value));
  const pointsOk = !!cust && usable >= rules.min;
  const discount = usePoints && pointsOk ? rules.worth(usable) : 0;
  const delivery = fulfil === "pickup" ? 0 : Math.max(0, Math.floor(Number(fee) || 0));
  const total = subtotal - discount + delivery;
  const hasCustomer = !!cust || (isNew && typedPhone.length >= 10 && nc.name.trim().length >= 2);
  const ready = hasCustomer && cart.length > 0 && (fulfil === "pickup" || address.trim().length >= 3);

  function reset() {
    setCart([]); setCust(null); setIsNew(false); setNc({ phone: "", name: "" }); setAddress(""); setIsland(""); setNotes(""); setUsePoints(false); setErr("");
  }

  async function submit() {
    setBusy(true); setErr("");
    let code = "";
    try {
      const r = (await postJson({
        kind: "order_create", customer_id: cust?.id, new_customer: cust ? undefined : { ...nc, island, address },
        items: cart, fulfilment: fulfil, island, address, delivery, payment, notes, use_points: usePoints && pointsOk,
      })) as unknown as { code: string; created_customer: boolean };
      code = r.code;
      if (after !== "pending") await postJson({ kind: "order_status", code, status: "confirmed" });
      if (after === "completed") {
        await postJson({ kind: "order_delivery", code, delivery: "delivered" });
        await postJson({ kind: "order_status", code, status: "completed" });
      }
      toast(`${code} created${r.created_customer ? " and a new customer added" : ""}. ${after === "pending" ? "It is waiting in To confirm." : after === "confirmed" ? "Confirmed, stock updated." : "Completed and counted in sales."}`);
      reset();
      await onCreated(after);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      if (code) { toast(`${code} was created, but the next step failed: ${msg}`); reset(); await onCreated("pending"); }
      else setErr(msg);
    } finally { setBusy(false); }
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 pb-24 lg:grid-cols-[minmax(0,1fr)_400px] lg:pb-0">
      {/* Products */}
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-4 py-2.5 ring-1 ring-tt-line">
            <IconSearch size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products, brand or SKU" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{ id: "all", name: "All" }, ...d.categories.filter((c) => !c.hidden), ...(bundles.length ? [{ id: "bundles", name: "Bundles & deals" }] : [])].map((c) => (
            <button key={c.id} type="button" onClick={() => setCat(c.id)} className={`shrink-0 ${pill(cat === c.id)}`}>{c.name}</button>
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {shownBundles.map((b) => {
            const id = BUNDLE_PREFIX + b.id; const ok = canAdd(id); const n = cart.find((l) => l.id === id)?.qty ?? 0;
            return (
              <li key={id}>
                <button type="button" disabled={!ok} onClick={() => add(id)} className={`relative flex h-full w-full flex-col rounded-3xl bg-white p-3 text-left ring-1 transition ${n ? "ring-2 ring-tt-leaf" : "ring-tt-line hover:ring-tt-ink/30"} disabled:opacity-50`}>
                  {n ? <span className="absolute right-2 top-2 grid h-7 min-w-7 place-items-center rounded-full bg-tt-leaf px-2 text-xs font-bold text-white">{n}</span> : null}
                  <img src={b.image} alt="" className="aspect-square w-full rounded-2xl bg-tt-milk object-cover" />
                  <span className="mt-2 text-[11px] font-bold uppercase tracking-wider text-[#C2553B]">{b.kind === "saver" ? "Super saver" : "Bundle"}</span>
                  <span className="line-clamp-2 text-sm font-semibold leading-snug">{b.name}</span>
                  <span className="mt-auto pt-1 text-sm font-bold">{mvr(b.price)}</span>
                </button>
              </li>
            );
          })}
          {shown.map((p) => {
            const ok = canAdd(p.id); const n = cart.find((l) => l.id === p.id)?.qty ?? 0; const l = left(p);
            return (
              <li key={p.id}>
                <button type="button" disabled={!ok} onClick={() => add(p.id)} className={`relative flex h-full w-full flex-col rounded-3xl bg-white p-3 text-left ring-1 transition ${n ? "ring-2 ring-tt-leaf" : "ring-tt-line hover:ring-tt-ink/30"} disabled:opacity-50`}>
                  {n ? <span className="absolute right-2 top-2 grid h-7 min-w-7 place-items-center rounded-full bg-tt-leaf px-2 text-xs font-bold text-white">{n}</span> : null}
                  <img src={p.image} alt="" className="aspect-square w-full rounded-2xl bg-tt-milk object-cover" />
                  <span className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{p.name}</span>
                  <span className="mt-auto flex items-center justify-between gap-2 pt-1 text-sm">
                    <b>{mvr(p.price)}</b>
                    <span className={`text-xs ${!p.in_stock || l <= 0 ? "font-semibold text-[#A3283F]" : "text-tt-soft"}`}>{!p.in_stock || l <= 0 ? "Out of stock" : Number.isFinite(l) ? `${l} left` : ""}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {!shown.length && !shownBundles.length ? <Card><p className="text-center text-tt-soft">No products match.</p></Card> : null}
      </div>

      {/* Order */}
      <div id="tt-pos-order" className="min-w-0 scroll-mt-4 space-y-4 lg:sticky lg:top-4">
        <Card className="!p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="tt-display text-lg font-bold">Customer</h3>
            {!cust ? (
              <button type="button" onClick={() => { setIsNew(!isNew); setErr(""); }} className="text-sm font-semibold text-tt-leaf underline underline-offset-4">{isNew ? "Find existing" : "+ New customer"}</button>
            ) : null}
          </div>
          {cust ? (
            <div className="mt-3 flex items-start gap-3 rounded-2xl bg-tt-milk p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tt-sage font-bold text-tt-mintdeep">{cust.name.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">{cust.name}</p>
                <p className="text-tt-soft">+{normalizePhone(cust.phone)} · {cust.order_count} orders · {cust.points ?? 0} points</p>
                {cust.has_login === 0 ? <p className="text-xs text-[#8A3B22]">No password yet</p> : null}
              </div>
              <button type="button" aria-label="Change customer" onClick={() => { setCust(null); setUsePoints(false); }} className="rounded-full p-1.5 hover:bg-white"><IconClose size={16} /></button>
            </div>
          ) : isNew ? (
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-semibold">Mobile number<input value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} inputMode="tel" placeholder="7xx xxxx" className={inputCls} /></label>
              {existing ? (
                <div className="rounded-2xl bg-tt-butter/60 p-3 text-sm">
                  <p><b>{existing.name}</b> already has this number.</p>
                  <button type="button" onClick={() => pick(existing)} className="mt-1 font-semibold text-tt-leaf underline underline-offset-4">Use this customer</button>
                </div>
              ) : (
                <label className="block text-xs font-semibold">Name<input value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} placeholder="Customer's name" className={inputCls} /></label>
              )}
              <p className="text-xs text-tt-soft">Saved to Customers. When they sign up on the website with this number, they get a link to set a password and see these orders.</p>
            </div>
          ) : (
            <div className="relative mt-3">
              <label className="flex items-center gap-2 rounded-2xl bg-tt-milk px-4 py-3 ring-1 ring-tt-line focus-within:ring-2 focus-within:ring-tt-leaf">
                <IconSearch size={17} />
                <input value={custQ} onChange={(e) => setCustQ(e.target.value)} placeholder="Search name or mobile" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
              </label>
              {custQ.trim().length >= 2 ? (
                <ul className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-tt-line">
                  {matches.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => pick(c)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-tt-milk">
                        <span><b>{c.name}</b><span className="block text-tt-soft">+{normalizePhone(c.phone)}</span></span>
                        <span className="text-xs text-tt-soft">{c.order_count} orders</span>
                      </button>
                    </li>
                  ))}
                  <li>
                    <button type="button" onClick={() => { const digits = custQ.replace(/\D/g, ""); setIsNew(true); setNc({ phone: digits.length >= 7 ? custQ.trim() : "", name: digits.length >= 7 ? "" : custQ.trim() }); setCustQ(""); }} className="w-full border-t border-tt-line px-4 py-3 text-left text-sm font-semibold text-tt-leaf hover:bg-tt-milk">
                      + Add "{custQ.trim()}" as a new customer
                    </button>
                  </li>
                </ul>
              ) : null}
            </div>
          )}
        </Card>

        <Card className="!p-5">
          <h3 className="tt-display text-lg font-bold">Order</h3>
          {cart.length ? (
            <ul className="mt-3 divide-y divide-tt-line">
              {cart.map((l) => {
                const i = lineInfo(l.id);
                return (
                  <li key={l.id} className="flex items-center gap-3 py-2.5">
                    <img src={i.image} alt="" className="h-11 w-11 shrink-0 rounded-xl bg-tt-milk object-cover" />
                    <div className="min-w-0 flex-1 text-sm"><p className="truncate font-semibold">{i.name}</p><p className="text-tt-soft">{mvr(i.price)}</p></div>
                    <div className="flex items-center gap-1 rounded-full bg-tt-milk p-1">
                      <button type="button" aria-label="One less" onClick={() => dec(l.id)} className="grid h-7 w-7 place-items-center rounded-full bg-white"><IconMinus size={14} /></button>
                      <span className="w-6 text-center text-sm font-bold">{l.qty}</span>
                      <button type="button" aria-label="One more" disabled={!canAdd(l.id)} onClick={() => add(l.id)} className="grid h-7 w-7 place-items-center rounded-full bg-white disabled:opacity-40"><IconPlus size={14} /></button>
                    </div>
                    <span className="w-20 text-right text-sm font-semibold">{mvr(i.price * l.qty)}</span>
                  </li>
                );
              })}
            </ul>
          ) : <p className="mt-2 rounded-2xl bg-tt-milk px-4 py-6 text-center text-sm text-tt-soft">Tap products on the left to add them.</p>}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setFulfil("delivery")} className={pill(fulfil === "delivery")}>Delivery</button>
            <button type="button" onClick={() => setFulfil("pickup")} className={pill(fulfil === "pickup")}>In-store / pickup</button>
          </div>
          {fulfil === "delivery" ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_110px]">
              <label className="text-xs font-semibold sm:col-span-2">Delivery address<input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House, road, flat" className={inputCls} /></label>
              <label className="text-xs font-semibold">Island / area<input value={island} onChange={(e) => setIsland(e.target.value)} placeholder="Malé" className={inputCls} /></label>
              <label className="text-xs font-semibold">Delivery fee<input value={fee} onChange={(e) => setFee(e.target.value)} type="number" min={0} className={inputCls} /></label>
            </div>
          ) : null}

          <p className="mt-4 text-xs font-semibold">Payment</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {PAYMENTS.map((p) => <button key={p.id} type="button" onClick={() => setPayment(p.id)} className={pill(payment === p.id)}>{p.label}</button>)}
          </div>
          <label className="mt-3 block text-xs font-semibold">Note (optional)<input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. ordered by phone, deliver after 5pm" className={inputCls} /></label>
          {pointsOk ? (
            <label className="mt-3 flex items-center gap-2 rounded-2xl bg-[#FFF3CC] px-4 py-3 text-sm">
              <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} className="h-4 w-4 accent-[#1B8053]" />
              Use {cust?.name.split(" ")[0]}'s Bean Points ({bal} = up to {mvr(rules.worth(usable))} off)
            </label>
          ) : null}

          <dl className="mt-4 space-y-1.5 border-t border-tt-line pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-tt-soft">Subtotal</dt><dd>{mvr(subtotal)}</dd></div>
            {discount ? <div className="flex justify-between text-[#9A6A12]"><dt>Bean Points</dt><dd>-{mvr(discount)}</dd></div> : null}
            <div className="flex justify-between"><dt className="text-tt-soft">Delivery</dt><dd>{mvr(delivery)}</dd></div>
            <div className="flex justify-between pt-1 text-lg font-bold"><dt>Total</dt><dd>{mvr(total)}</dd></div>
          </dl>
        </Card>

        <Card className="!p-5">
          <p className="text-xs font-semibold">After saving</p>
          <div className="mt-2 space-y-2">
            {AFTER.map((a) => (
              <button key={a.id} type="button" onClick={() => setAfter(a.id)} className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left ring-1 transition ${after === a.id ? "bg-tt-sage/60 ring-tt-leaf" : "bg-white ring-tt-line"}`}>
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${after === a.id ? "bg-tt-leaf text-white" : "ring-1 ring-tt-line"}`}>{after === a.id ? <IconCheck size={12} /> : null}</span>
                <span className="text-sm"><b>{a.label}</b><span className="block text-tt-soft">{a.hint}</span></span>
              </button>
            ))}
          </div>
          {err ? <p className="mt-3 rounded-2xl bg-tt-blush px-4 py-3 text-sm font-semibold text-[#8C2F45]" role="alert">{err}</p> : null}
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1"><Btn disabled={busy || !ready || !!existing} onClick={() => void submit()}>{busy ? "Saving..." : `Create order · ${mvr(total)}`}</Btn></div>
            {cart.length || cust || isNew ? <Btn tone="ghost" disabled={busy} onClick={reset}>Clear</Btn> : null}
          </div>
          {!ready && !busy ? <p className="mt-2 text-xs text-tt-soft">{!hasCustomer ? "Choose or add a customer." : !cart.length ? "Add at least one product." : "Add the delivery address."}</p> : null}
        </Card>
      </div>
      {/* Phone: always-visible summary that jumps to the order */}
      <div className="fixed inset-x-3 bottom-3 z-30 lg:hidden">
        <button type="button" onClick={() => document.getElementById("tt-pos-order")?.scrollIntoView({ behavior: "smooth" })} className="flex w-full items-center justify-between gap-3 rounded-full bg-tt-ink px-5 py-3.5 text-white shadow-[0_18px_40px_-18px_rgba(42,36,64,0.8)]">
          <span className="text-sm font-semibold">{cart.reduce((n, l) => n + l.qty, 0)} items{cust ? ` · ${cust.name.split(" ")[0]}` : isNew && nc.name ? ` · ${nc.name.split(" ")[0]}` : ""}</span>
          <span className="text-sm font-bold">{mvr(total)} · Review ↓</span>
        </button>
      </div>
    </div>
  );
}
