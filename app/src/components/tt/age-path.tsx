import { Link } from "@tanstack/react-router";

import { AGES } from "../../lib/catalog";

const ICONS = ["/assets/3d/age-porridge.webp", "/assets/3d/age-sticks.webp", "/assets/3d/age-puffs.webp", "/assets/3d/age-pasta.webp"];
const INK = ["#8A3B22", "#13663F", "#4D3A86", "#8C2F45"];

/** Simple age cards: a soft tile with a 3D food, the month badge and a short line. */
export function AgePath({ t }: { t: (k: string) => string }) {
  return (
    <div className="mt-9 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {AGES.map((a, i) => (
        <Link key={a.id} to="/shop" search={{ age: a.id }} className="group flex flex-col rounded-[28px] bg-white p-3 ring-1 ring-tt-line transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_40px_-28px_rgba(42,36,64,0.5)] sm:p-4">
          <div className="relative grid aspect-[5/4] place-items-center overflow-hidden rounded-[22px]" style={{ background: a.tint }}>
            <span className="absolute inset-x-8 bottom-3 h-4 rounded-full bg-black/5 blur-md transition-transform duration-500 group-hover:scale-75" />
            <img src={ICONS[i]} alt="" loading="lazy" className="relative w-[62%] max-w-[150px] transition-transform duration-500 group-hover:-translate-y-2 group-hover:scale-105" />
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold" style={{ color: INK[i] }}>{a.label}</span>
          </div>
          <div className="flex flex-1 items-end justify-between gap-2 px-1 pb-1 pt-4">
            <div>
              <p className="tt-display text-lg font-bold leading-tight">{t(`${a.key}_title`)}</p>
              <p className="mt-1 text-[13px] leading-snug text-tt-soft">{t(`${a.key}_note`)}</p>
            </div>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors duration-300 group-hover:text-white" style={{ background: a.tint, color: INK[i] }} aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
