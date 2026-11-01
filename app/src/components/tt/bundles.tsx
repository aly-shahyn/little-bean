import { bundleItems, mvr, type Bundle } from "../../lib/catalog";
import { useCart } from "../../lib/cart";
import { useShop } from "../../lib/use-shop";
import { IconPlus } from "./icons";

export function useBundleInfo(b: Bundle) {
  const { products } = useShop();
  const parts = bundleItems(b).map((it) => ({ ...it, p: products.find((p) => p.id === it.id) }));
  const worth = parts.reduce((s, x) => s + (x.p?.price ?? 0) * x.qty, 0);
  const save = Math.max(0, worth - b.price);
  const available = parts.length > 0 && parts.every((x) => x.p && x.p.in_stock);
  return { parts, worth, save, pct: worth ? Math.round((save / worth) * 100) : 0, available };
}

export function BundleCard({ b }: { b: Bundle }) {
  const { addBundle } = useCart();
  const { parts, worth, save, pct, available } = useBundleInfo(b);
  const saver = b.kind === "saver";
  const pics = parts.map((x) => x.p?.image).filter(Boolean).slice(0, 4) as string[];
  const cover = b.image || pics[0] || "/assets/3d/bundle-gift.webp";

  return (
    <article className="group flex h-full flex-col rounded-[28px] bg-white p-3 ring-1 ring-tt-line transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_40px_-28px_rgba(42,36,64,0.5)] sm:p-4">
      <div className={`relative aspect-[5/4] overflow-hidden rounded-[22px] ${saver ? "bg-[#FFD6C7]" : "bg-[#E7E0FF]"}`}>
        {b.image ? (
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className={`grid h-full grid-cols-2 gap-1.5 p-3 ${pics.length > 2 ? "grid-rows-2" : ""}`}>
            {pics.map((src, i) => <img key={i} src={src} alt="" loading="lazy" className={`h-full w-full rounded-2xl bg-white object-cover ${pics.length === 3 && i === 2 ? "col-span-2" : ""}`} />)}
          </div>
        )}
        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${saver ? "bg-tt-coral text-tt-ink" : "bg-white text-[#4D3A86]"}`}>{saver ? "Super saver" : "Bundle"}</span>
        {pct ? <span className="absolute right-3 top-3 rounded-full bg-tt-ink px-2.5 py-1 text-xs font-bold text-white">-{pct}%</span> : null}
      </div>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
        {b.age ? <p className="text-[11px] font-bold uppercase tracking-wider text-tt-soft">Age {b.age}</p> : null}
        <h3 className="tt-display text-lg font-bold leading-tight">{b.name}</h3>
        <p className="mt-1 text-[13px] leading-snug text-tt-soft">{b.blurb || parts.map((x) => `${x.qty > 1 ? `${x.qty} x ` : ""}${x.p?.name ?? x.id}`).join(", ")}</p>
        <p className="mt-2 text-[12px] text-tt-soft">{parts.length} item{parts.length === 1 ? "" : "s"} · {parts.map((x) => x.p?.name.split(",")[0]).filter(Boolean).slice(0, 3).join(" · ")}{parts.length > 3 ? "..." : ""}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div>
            {save ? <p className="text-xs text-tt-soft line-through">{mvr(worth)}</p> : null}
            <p className="tt-display text-2xl font-extrabold text-tt-leafdeep">{mvr(b.price)}</p>
            {save ? <p className="text-xs font-bold text-tt-leafdeep">You save {mvr(save)}</p> : null}
          </div>
          <button type="button" disabled={!available} onClick={() => addBundle(b, cover)} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-tt-leaf px-4 text-sm font-semibold text-white transition hover:bg-tt-leafdeep disabled:opacity-40">
            <IconPlus size={16} /> {available ? "Add" : "Sold out"}
          </button>
        </div>
      </div>
    </article>
  );
}

export function BundlesGrid({ list }: { list: Bundle[] }) {
  return (
    <div className="tt-noscroll -mx-5 mt-9 flex snap-x gap-3 overflow-x-auto px-5 pb-2 sm:gap-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
      {list.map((b) => <div key={b.id} className="w-[78%] shrink-0 snap-start sm:w-[45%] lg:w-auto"><BundleCard b={b} /></div>)}
    </div>
  );
}
