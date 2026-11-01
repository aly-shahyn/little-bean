import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { AGES, mvr } from "../../lib/catalog";
import { useShop } from "../../lib/use-shop";
import { IconArrow, IconClose, IconSearch } from "./icons";

/** Top search: live results as you type, Enter opens the shop filtered by the words. */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { products, categories, brandOf, categoryOf } = useShop();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => input.current?.focus(), 30);
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => { window.clearTimeout(t); window.removeEventListener("keydown", k); };
  }, [open, onClose]);

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return products
      .filter((p) => !p.hidden)
      .map((p) => {
        const hay = `${p.name} ${brandOf(p.brand).name} ${categoryOf(p.category).name} ${p.age} ${p.short}`.toLowerCase();
        const hit = words.every((w) => hay.includes(w));
        const score = (p.name.toLowerCase().startsWith(words[0]) ? 2 : 0) + (p.name.toLowerCase().includes(words[0]) ? 1 : 0);
        return { p, hit, score };
      })
      .filter((x) => x.hit)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p);
  }, [q, products, brandOf, categoryOf]);

  const go = () => {
    onClose();
    void navigate({ to: "/shop", search: { q: q.trim() || undefined } });
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Search products">
      <div className="absolute inset-0 bg-tt-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="tt-rise relative mx-auto mt-3 w-[calc(100%-24px)] max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-[0_30px_70px_-30px_rgba(42,36,64,0.5)]">
        <form onSubmit={(e) => { e.preventDefault(); go(); }} className="flex items-center gap-3 border-b border-tt-line px-5">
          <IconSearch size={22} className="shrink-0 text-tt-leaf" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search porridge, puffs, brands..." className="h-16 min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-tt-soft focus-visible:outline-none" aria-label="Search" />
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-tt-milk" aria-label="Close search"><IconClose size={18} /></button>
        </form>
        <div className="max-h-[65dvh] overflow-y-auto p-3">
          {!q.trim() ? (
            <div className="p-2">
              <p className="px-1 text-xs font-bold uppercase tracking-[0.14em] text-tt-soft">Popular</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <Link key={c.id} to="/shop" search={{ category: c.id }} onClick={onClose} className="rounded-full px-3.5 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5" style={{ background: c.tint, color: c.ink }}>{c.name}</Link>
                ))}
              </div>
              <p className="mt-5 px-1 text-xs font-bold uppercase tracking-[0.14em] text-tt-soft">By age</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {AGES.map((a) => (
                  <Link key={a.id} to="/shop" search={{ age: a.id }} onClick={onClose} className="rounded-full bg-tt-milk px-3.5 py-2 text-sm font-semibold ring-1 ring-tt-line hover:bg-white">{a.label}</Link>
                ))}
              </div>
            </div>
          ) : results.length ? (
            <>
              <ul>
                {results.slice(0, 6).map((p) => (
                  <li key={p.id}>
                    <Link to="/product/$id" params={{ id: p.id }} onClick={onClose} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-tt-milk">
                      <img src={p.image} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-tt-milk object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-tt-soft">{brandOf(p.brand).name}</span>
                        <span className="block truncate font-semibold">{p.name}</span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-tt-leafdeep">{mvr(p.price)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={go} className="mt-2 flex w-full items-center justify-between rounded-2xl bg-tt-sage px-4 py-3 text-sm font-bold text-tt-mintdeep">
                See all {results.length} result{results.length === 1 ? "" : "s"} <IconArrow size={16} />
              </button>
            </>
          ) : (
            <p className="p-6 text-center text-tt-soft">Nothing found for "{q}". Try a brand, flavour or age.</p>
          )}
        </div>
      </div>
    </div>
  );
}
