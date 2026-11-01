import { useEffect, useState } from "react";

import { mvr, normalizePhone, type OrderItem } from "../../lib/catalog";
import type { MyOrder } from "../../lib/account";
import { useCart } from "../../lib/cart";
import { useShop } from "../../lib/use-shop";
import { IconCheck } from "./icons";

/** Customer-facing delivery steps, driven by the order status and the delivery step the shop sets in Admin. */
const STEPS = [
  { label: "Placed", img: "/assets/3d/step-basket.webp", tint: "#FFE9A8" },
  { label: "Packing", img: "/assets/3d/step-confirm.webp", tint: "#D8F3E3" },
  { label: "On the way", img: "/assets/3d/step-deliver.webp", tint: "#FFD6C7" },
  { label: "Delivered", img: "/assets/3d/step-home.webp", tint: "#CDEBFF" },
];
const MESSAGE = [
  { title: "Order received", text: "We're checking your order and will confirm it on WhatsApp soon." },
  { title: "Packing your order", text: "Confirmed! We're packing your goodies now." },
  { title: "On the way to you", text: "Our rider is heading to your door. Keep your phone nearby." },
  { title: "Delivered", text: "Enjoy! We hope your little one loves every bite." },
];

export function orderStep(o: Pick<MyOrder, "status" | "delivery_status">): number {
  if (o.status === "cancelled") return -1;
  if (o.status === "completed") return 3;
  if (o.status === "confirmed") return o.delivery_status === "delivered" ? 3 : o.delivery_status === "out_for_delivery" ? 2 : 1;
  return 0;
}

/** A missing photo shows as a soft tile instead of a broken-image icon. */
const hideBroken = (e: React.SyntheticEvent<HTMLImageElement>) => { const el = e.currentTarget; el.removeAttribute("src"); el.style.background = "#EEF6EE"; };

const when = (s?: string | null) => (s ? new Date(s.replace(" ", "T") + "Z").toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
const day = (s?: string | null) => (s ? new Date(s.replace(" ", "T") + "Z").toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");

function Tracker({ o, step }: { o: MyOrder; step: number }) {
  const [fill, setFill] = useState(0);
  useEffect(() => { const t = window.setTimeout(() => setFill(step), 120); return () => window.clearTimeout(t); }, [step]);
  const times = [o.created_at, o.confirmed_at, o.out_for_delivery_at, o.delivered_at || o.completed_at];
  const pct = (fill / 3) * 100;
  return (
    <div className="px-1">
      <div className="relative mx-[12.5%] mt-2 h-1.5 rounded-full bg-tt-line">
        <div className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#FFB547,#FF7A59)] transition-[width] duration-[1100ms] ease-out" style={{ width: `${pct}%` }} />
        {step === 2 ? (
          <span className="absolute -top-[32px] -translate-x-1/2 transition-[left] duration-[1100ms] ease-out" style={{ left: `${pct}%` }}>
            <img src="/assets/3d/step-deliver.webp" alt="" className="tt-bob block h-9 w-9 object-contain" />
          </span>
        ) : null}
      </div>
      <ol className="relative -mt-[15px] grid grid-cols-4">
        {STEPS.map((s, i) => {
          const done = i < step || (i === step && step === 3);
          const current = i === step && step < 3;
          return (
            <li key={s.label} className="flex flex-col items-center text-center">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full ring-4 ring-white transition-colors duration-500 ${done ? "bg-tt-leaf text-white" : current ? "tt-pulse bg-tt-coral" : "bg-tt-line"}`}
                aria-hidden="true"
              >
                {done ? <IconCheck size={12} /> : current ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
              </span>
              <span className={`mt-1.5 text-[12px] font-bold leading-tight ${i <= step ? "text-tt-ink" : "text-tt-soft"}`}>{s.label}</span>
              <span className="mt-0.5 h-4 text-[10.5px] leading-tight text-tt-soft">{i <= step && times[i] ? when(times[i]) : ""}</span>
            </li>
          );
        })}
      </ol>
      <p className="sr-only">Step {step + 1} of 4: {STEPS[step]?.label}</p>
    </div>
  );
}

export function OrderJourney({ o, compact = false }: { o: MyOrder; compact?: boolean }) {
  const { products, settings, bundles } = useShop();
  const { add, addBundle } = useCart();
  let items: OrderItem[] = [];
  try { items = JSON.parse(o.items_json); } catch { items = []; }
  const step = orderStep(o);
  const active = step >= 0 && step < 3;
  const [open, setOpen] = useState(false);
  const wa = normalizePhone(settings.whatsapp || "");
  // Prefer the product's current photo: photos saved on old orders may have been replaced since.
  const thumbs = items.map((it) => ({ it, img: products.find((p) => p.id === it.id)?.image || it.image || products.find((p) => p.id === it.bundle_items?.[0]?.id)?.image || "" }));
  const count = items.reduce((n, it) => n + it.qty, 0);
  const m = step >= 0 ? MESSAGE[step] : { title: "Cancelled", text: "This order was cancelled. Message us if you have any questions." };
  const pill = step < 0 ? "bg-tt-blush text-[#8C2F45]" : step === 3 ? "bg-tt-sage text-tt-mintdeep" : "bg-tt-butter text-[#7A5A0E]";

  function orderAgain() {
    for (const it of items) {
      if (it.id.startsWith("bundle:")) {
        const b = bundles.find((x) => `bundle:${x.id}` === it.id);
        if (b) addBundle(b, it.image || "");
        continue;
      }
      const p = products.find((x) => x.id === it.id && x.in_stock);
      if (p) add(p, it.qty, false);
    }
  }

  return (
    <li className={`overflow-hidden rounded-[24px] bg-white ring-1 ${active ? "ring-tt-coral/40 shadow-[0_16px_34px_-26px_rgba(42,36,64,0.5)]" : "ring-tt-line"}`}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-4 text-left sm:p-5" aria-expanded={open}>
        <span className="flex shrink-0 -space-x-3">
          {thumbs.slice(0, 3).map(({ img }, k) => (img ? <img key={k} src={img} alt="" onError={hideBroken} className="h-11 w-11 rounded-xl bg-tt-milk object-cover ring-2 ring-white" /> : <span key={k} className="h-11 w-11 rounded-xl bg-tt-milk ring-2 ring-white" />))}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${pill}`}>{step < 0 ? "Cancelled" : step === 3 ? `Delivered ${day(o.delivered_at || o.completed_at)}` : STEPS[step].label}</span>
          <span className="mt-1 block truncate text-xs text-tt-soft">{o.code} · {day(o.created_at)} · {count} item{count === 1 ? "" : "s"}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="tt-display text-base font-bold sm:text-lg">{mvr(o.total)}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className={`text-tt-soft transition-transform ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </button>

      {active || (open && step >= 0 && !compact) ? (
        <div className="border-t border-tt-line/70 px-4 pb-4 pt-5 sm:px-5">
          <Tracker o={o} step={step} />
          {active ? (
            <div className="mt-3 flex items-start gap-3 rounded-2xl bg-tt-milk px-4 py-3">
              <img src={STEPS[step].img} alt="" className="h-10 w-10 shrink-0 object-contain" />
              <p className="text-sm"><b className="block">{m.title}</b><span className="text-tt-soft">{m.text}</span></p>
            </div>
          ) : null}
        </div>
      ) : null}
      {step < 0 && open ? <p className="mx-4 mb-3 rounded-2xl bg-tt-blush px-4 py-3 text-sm font-semibold text-[#8C2F45] sm:mx-5">{m.text}</p> : null}

      {open ? (
        <div className="px-4 pb-5 sm:px-5">
          <ul className="divide-y divide-tt-line/70 rounded-2xl bg-tt-milk px-3">
            {thumbs.map(({ it, img }, k) => (
              <li key={k} className="flex items-center gap-3 py-2.5">
                {img ? <img src={img} alt="" onError={hideBroken} className="h-10 w-10 rounded-lg bg-white object-cover" /> : <span className="h-10 w-10 rounded-lg bg-white" />}
                <span className="min-w-0 flex-1 text-sm"><span className="block truncate font-semibold">{it.name}</span><span className="text-xs text-tt-soft">x{it.qty}{it.bundle_items?.length ? ` · ${it.bundle_items.length} items` : ""}</span></span>
                <span className="text-sm font-semibold">{mvr(it.price * it.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 px-1 text-sm">
            {o.points_discount ? <p className="flex justify-between text-[#7A5A0E]"><span>Bean Points ({o.points_used})</span><span>-{mvr(o.points_discount)}</span></p> : null}
            {o.delivery ? <p className="flex justify-between text-tt-soft"><span>Delivery</span><span>{mvr(o.delivery)}</span></p> : null}
            <p className="flex justify-between font-bold"><span>Total</span><span>{mvr(o.total)}</span></p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={orderAgain} className="rounded-full bg-tt-leaf px-4 py-2 text-sm font-semibold text-white transition hover:bg-tt-leafdeep">Order again</button>
            {wa ? <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi! About my order ${o.code}`)}`} target="_blank" rel="noreferrer" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-tt-line hover:bg-tt-milk">Ask about this order</a> : null}
            {o.points_earned ? <span className="ml-auto rounded-full bg-tt-butter px-3 py-1.5 text-xs font-bold text-[#7A5A0E]">+{o.points_earned} Bean Points</span> : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}
