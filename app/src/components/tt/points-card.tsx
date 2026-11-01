import { Link } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";

import { mvr, pointsRules } from "../../lib/catalog";
import { useAccount } from "../../lib/account";
import { useCart } from "../../lib/cart";
import { useScrollLock } from "../../lib/scroll-lock";
import { useShop } from "../../lib/use-shop";

const REASON: Record<string, string> = { earn: "Earned", redeem: "Used", refund: "Returned", reverse: "Removed", adjust: "Gift from us" };

// Bean colours from the brand: mascot mint, leaf greens, butter and peach.
const BEAN_COLORS = ["#BFEBCF", "#2FB27D", "#FFE9A8", "#9ED9B5", "#FFD6C7", "#1B8053", "#C8EAD3"];
// Bean spots inside the jar, bottom row first. Every 7th bean wears the mascot's smile.
const SPOTS: { x: number; y: number; r: number; c: string; face: boolean }[] = (() => {
  const out: { x: number; y: number; r: number; c: string; face: boolean }[] = [];
  const rows = [118, 108, 98, 88, 78, 68, 58, 48];
  rows.forEach((y, ri) => {
    const xs = ri % 2 ? [37, 52, 67, 82] : [30, 45, 60, 75, 90];
    xs.forEach((x, ci) => {
      const k = out.length;
      out.push({ x, y, r: ((k * 47) % 70) - 35, c: BEAN_COLORS[(k * 3 + ri) % BEAN_COLORS.length]!, face: k % 7 === 3 });
    });
  });
  return out;
})();

/** The Bean Points jar: a glass jar with a forest-green lid and a sprout, filling with smiling beans.
 *  `fill` (0..1) sets how full it is. */
export function BeanJarIcon({ size = 120, fill = 0.7, animate = false }: { size?: number; fill?: number; animate?: boolean }) {
  const id = useId().replace(/:/g, "");
  const n = Math.round(Math.min(1, Math.max(0, fill)) * SPOTS.length);
  return (
    <svg width={size} height={size * (140 / 120)} viewBox="0 0 120 140" aria-hidden="true" className="overflow-visible">
      <defs>
        <linearGradient id={`glass${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".96" />
          <stop offset=".6" stopColor="#F2FAF5" stopOpacity=".8" />
          <stop offset="1" stopColor="#DDF1E5" stopOpacity=".95" />
        </linearGradient>
        <linearGradient id={`lid${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#23704A" />
          <stop offset="1" stopColor="#17432F" />
        </linearGradient>
        <clipPath id={`in${id}`}><rect x="22" y="36" width="76" height="92" rx="20" /></clipPath>
      </defs>
      <ellipse cx="60" cy="133" rx="38" ry="5" fill="#17432F" opacity=".1" />
      <rect x="22" y="36" width="76" height="92" rx="20" fill={`url(#glass${id})`} stroke="#A9DBBD" strokeWidth="2" />
      <g clipPath={`url(#in${id})`}>
        {SPOTS.slice(0, n).map((b, i) => (
          <g key={i} transform={`translate(${b.x} ${b.y}) rotate(${b.r})`}>
            <g className={animate ? "tt-bean-drop" : undefined} style={animate ? { animationDelay: `${i * 35}ms` } : undefined}>
              <path d="M-7.5 -1.5C-7.5 -5.5 -3.5 -6.5 0 -5c2 .9 3.3.3 4.6-.3C7 -6.4 8.5 -3.5 8 .5 7.4 5 3.5 6.6 -.5 6.2 -4.8 5.8 -7.5 3 -7.5 -1.5Z" fill={b.c} />
              {b.face ? (
                <>
                  <circle cx="-2.6" cy="-.6" r=".9" fill="#2A2440" />
                  <circle cx="2.2" cy="-.6" r=".9" fill="#2A2440" />
                  <path d="M-1.6 1.6q1 1.2 2 0" stroke="#D04128" strokeWidth=".9" fill="none" strokeLinecap="round" />
                </>
              ) : (
                <path d="M-3 -2.5q2 -1.4 4 0" stroke="#fff" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity=".7" />
              )}
            </g>
          </g>
        ))}
      </g>
      {/* glass shine */}
      <path d="M31 50v52" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".9" />
      <path d="M31 108v6" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".9" />
      {/* neck and lid */}
      <rect x="30" y="27" width="60" height="12" rx="5" fill="#E3F4EA" stroke="#A9DBBD" strokeWidth="1.6" />
      <rect x="25" y="13" width="70" height="17" rx="7" fill={`url(#lid${id})`} />
      <rect x="25" y="24" width="70" height="3" fill="#0F3323" opacity=".35" />
      <path d="M33 18h54" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".18" />
      {/* sprout */}
      <path d="M60 13c0-4 0-7-1-10" stroke="#2FB27D" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M59 5c-6-5-13-3-14 1 5 3 10 3 14-1Z" fill="#7CCB9C" />
      <path d="M60 6c4-6 12-6 14-2-4 4-10 5-14 2Z" fill="#2FB27D" />
      {/* label with the mascot smile */}
      <rect x="40" y="70" width="40" height="26" rx="11" fill="#fff" stroke="#C8EAD3" strokeWidth="1.6" />
      <circle cx="53" cy="81" r="1.8" fill="#2A2440" />
      <circle cx="67" cy="81" r="1.8" fill="#2A2440" />
      <path d="M55.5 86q4.5 4 9 0" stroke="#D04128" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="49" cy="86" r="2.4" fill="#FFB2A0" opacity=".7" />
      <circle cx="71" cy="86" r="2.4" fill="#FFB2A0" opacity=".7" />
    </svg>
  );
}

/** Small bean mark for compact places. */
export function BeanIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M27.6 5.6c6 2.5 9.1 9.6 6.8 17.2-2.5 8.3-10.3 13-18.1 11.1C8.7 32.2 3.9 25 5.8 18c1.2-4.6 4.8-6.5 8.7-6.7 3.2-.2 4.8-1.7 6.3-3.8 1.7-2.3 4.1-3.1 6.8-1.9Z" fill="#BFEBCF" />
      <circle cx="15.5" cy="20" r="1.6" fill="#2A2440" /><circle cx="24" cy="18.5" r="1.6" fill="#2A2440" />
      <path d="M17.5 24q3 2.4 6 -.6" stroke="#D04128" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M26 6c1-3 3-4.5 6-4.5-1 3-3 4.5-6 4.5Z" fill="#2FB27D" />
    </svg>
  );
}

const LEVELS = [
  { at: 0, name: "Little Sprout" },
  { at: 100, name: "Happy Bean" },
  { at: 300, name: "Blossom Bean" },
  { at: 600, name: "Golden Bean" },
];

/** Counts up to a number on first show. */
function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(target);
  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return setV(target);
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function usePoints() {
  const { points, ledger } = useAccount();
  const { settings } = useShop();
  const r = pointsRules(settings);
  const lifetime = ledger.filter((l) => l.reason === "earn" || l.reason === "adjust").reduce((n, l) => n + Math.max(0, l.change), 0);
  const li = LEVELS.reduce((k, l, i) => (lifetime >= l.at ? i : k), 0);
  const goal = Math.max(r.min, Math.ceil((points + 1) / 100) * 100);
  return { points, ledger, r, lifetime, li, level: LEVELS[li]!, next: LEVELS[li + 1], goal, pct: Math.min(100, Math.round((points / goal) * 100)), canUse: points >= r.min };
}

function Bar({ pct, dark = false }: { pct: number; dark?: boolean }) {
  return (
    <div className={`h-3 overflow-hidden rounded-full ${dark ? "bg-white/15 ring-1 ring-white/10" : "bg-tt-sage ring-1 ring-[#CFE7D7]"}`}>
      <div className="tt-bp-fill h-full rounded-full transition-[width] duration-[1200ms] ease-out" style={{ width: `${Math.max(3, pct)}%` }} />
    </div>
  );
}

/** Bean Points on My account: the number, the progress bar and a Learn more button that opens the full details. */
export function BeanPointsCard() {
  const p = usePoints();
  const [open, setOpen] = useState(false);
  const v = useCountUp(p.points);
  return (
    <>
      <section className="tt-bp-card tt-rise relative overflow-hidden rounded-[28px] p-5 text-white sm:p-6">
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#C8EAD3]"><BeanIcon size={20} /> Bean Points</p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="tt-display text-[2.6rem] font-extrabold leading-none sm:text-5xl">{v.toLocaleString()}</span>
              <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-bold text-[#DDF3E5] ring-1 ring-white/15">{p.level.name}</span>
            </p>
            <p className="mt-1.5 text-[15px] text-[#D7EEDF]">
              {p.canUse ? <>Worth <b className="text-white">{mvr(p.r.worth(p.points))}</b> off your next order</> : <>Just <b className="text-white">{p.r.min - p.points}</b> more to start saving at checkout</>}
            </p>
          </div>
          <button type="button" onClick={() => setOpen(true)} className="shrink-0 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-tt-forest shadow-[0_10px_22px_-12px_rgba(0,0,0,.6)] transition hover:-translate-y-0.5">Learn more</button>
        </div>
        <div className="relative mt-4">
          <Bar pct={p.pct} dark />
          <p className="mt-1.5 flex justify-between text-xs font-semibold text-[#BFE3CC]"><span>{p.points} / {p.goal}</span><span>{mvr(p.r.worth(p.goal))} off at {p.goal}</span></p>
        </div>
      </section>
      <BeanPointsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Full Bean Points details in a pop-up over a blurred page. */
export function BeanPointsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = usePoints();
  const { count } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);
  useScrollLock(open);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;

  const steps = [
    { t: "Shop for your little one", s: `Every ${mvr(p.r.perMvr)} you spend earns 1 Bean Point.` },
    { t: "Watch your jar fill", s: "Points are added once your order is delivered and completed." },
    { t: "Save at checkout", s: `Tick "Use my Bean Points" at checkout. Each point takes ${mvr(p.r.value)} off.` },
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Bean Points">
      <div className="tt-bp-backdrop absolute inset-0" onClick={onClose} />
      <div className="tt-bp-sheet relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[32px] bg-white shadow-[0_40px_90px_-30px_rgba(23,67,47,.6)] sm:rounded-[32px]">
        <div className="overflow-y-auto overscroll-contain">
          {/* jar */}
          <div className="tt-bp-hero relative px-6 pb-6 pt-8 text-center">
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-tt-ink shadow-sm transition hover:bg-white">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
            </button>
            <span className="tt-bean-sparkle" style={{ top: "22%", left: "24%" }} aria-hidden="true" />
            <span className="tt-bean-sparkle" style={{ top: "38%", right: "24%", animationDelay: "1.1s" }} aria-hidden="true" />
            <span className="tt-bean-sparkle" style={{ bottom: "34%", left: "30%", animationDelay: "2s" }} aria-hidden="true" />
            <div className="tt-bean-jar mx-auto w-fit"><BeanJarIcon size={150} fill={Math.max(0.12, p.pct / 100)} animate /></div>
            <p className="tt-display mt-4 text-5xl font-extrabold leading-none text-tt-forest">{p.points.toLocaleString()}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-tt-leafdeep">Bean Points · {p.level.name}</p>
            <p className="mt-2 text-[15px] text-tt-soft">
              {p.canUse ? <>Worth <b className="text-tt-ink">{mvr(p.r.worth(p.points))}</b> off your next order</> : <>Collect <b className="text-tt-ink">{p.r.min - p.points}</b> more to start saving</>}
            </p>
            <div className="mx-auto mt-4 max-w-sm text-left">
              <Bar pct={p.pct} />
              <p className="mt-1.5 flex justify-between text-xs font-semibold text-tt-soft"><span>{p.points} / {p.goal}</span><span>{mvr(p.r.worth(p.goal))} off at {p.goal}</span></p>
            </div>
          </div>

          <div className="space-y-6 px-6 pb-6 pt-5">
            {/* the rules at a glance */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { a: "1 point", b: `per ${mvr(p.r.perMvr)}` },
                { a: mvr(p.r.value), b: "per point" },
                { a: `${p.r.min}+`, b: "points to use" },
              ].map((x) => (
                <div key={x.b} className="rounded-2xl bg-tt-milk px-2 py-3 ring-1 ring-tt-line">
                  <b className="tt-display block text-lg leading-tight text-tt-forest">{x.a}</b>
                  <span className="text-[11px] font-semibold text-tt-soft">{x.b}</span>
                </div>
              ))}
            </div>

            <div>
              <h3 className="tt-display text-lg font-bold">How it works</h3>
              <ol className="mt-3 space-y-3">
                {steps.map((s, i) => (
                  <li key={s.t} className="flex gap-3">
                    <span className="tt-display grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tt-sage text-base font-extrabold text-tt-leafdeep">{i + 1}</span>
                    <span className="pt-0.5"><b className="block text-sm text-tt-ink">{s.t}</b><span className="text-sm text-tt-soft">{s.s}</span></span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h3 className="tt-display text-lg font-bold">Your bean level</h3>
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {LEVELS.map((l, i) => (
                  <div key={l.name} className={`rounded-2xl px-1.5 py-2.5 text-center ${i === p.li ? "bg-tt-forest text-white" : i < p.li ? "bg-tt-sage text-tt-leafdeep" : "bg-tt-milk text-tt-soft ring-1 ring-tt-line"}`}>
                    <BeanIcon size={18} />
                    <b className="mt-1 block text-[11px] leading-tight">{l.name}</b>
                    <span className="text-[10px] opacity-80">{l.at}+</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-tt-soft">{p.next ? `Earn ${p.next.at - p.lifetime} more points to reach ${p.next.name}.` : "You're a Golden Bean. Thank you for growing with us."} Levels count every point you've earned.</p>
            </div>

            <div>
              <h3 className="tt-display text-lg font-bold">History</h3>
              {p.ledger.length ? (
                <ul className="mt-2 divide-y divide-tt-line/70">
                  {p.ledger.slice(0, 15).map((l, i) => (
                    <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold ${l.change >= 0 ? "bg-tt-sage text-tt-leafdeep" : "bg-tt-blush text-[#8C2F45]"}`}>{l.change >= 0 ? "+" : "−"}</span>
                      <span className="min-w-0 flex-1 truncate"><b>{REASON[l.reason] ?? l.reason}</b> <span className="text-tt-soft">{l.note}</span></span>
                      <span className={`font-bold ${l.change >= 0 ? "text-tt-leafdeep" : "text-[#8C2F45]"}`}>{l.change > 0 ? "+" : ""}{l.change}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 rounded-2xl bg-tt-milk p-4 text-sm text-tt-soft ring-1 ring-tt-line">No points yet. Your first beans arrive with your first completed order.</p>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-tt-line bg-white p-4">
          <Link to={count && p.canUse ? "/checkout" : "/shop"} onClick={onClose} className="block rounded-full bg-tt-leaf py-3.5 text-center text-[15px] font-semibold text-white transition hover:bg-tt-leafdeep">
            {count && p.canUse ? "Use my points at checkout" : "Shop & earn points"}
          </Link>
        </div>
      </div>
    </div>
  );
}
