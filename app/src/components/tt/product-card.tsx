import { Link } from "@tanstack/react-router";

import { mvr, type Product } from "../../lib/catalog";
import { useShop } from "../../lib/use-shop";
import { useCart } from "../../lib/cart";
import { IconPlus } from "./icons";
import { SaveHeart } from "./save-heart";

export function ProductCard({ p }: { p: Product }) {
  const { add } = useCart();
  const { brandOf, categoryOf } = useShop();
  const cat = categoryOf(p.category);
  return (
    <article className="tt-card group relative flex flex-col overflow-hidden rounded-[28px] bg-white ring-1 ring-tt-line">
      <Link to="/product/$id" params={{ id: p.id }} className="block">
        <div className="relative aspect-[4/5] overflow-hidden" style={{ background: cat.tint }}>
          <img src={p.image} alt={p.name} loading="lazy" className="tt-card-img h-full w-full object-cover" />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-tt-ink backdrop-blur">
            {p.age}
          </span>
          <SaveHeart id={p.id} className="absolute right-3 top-3" />
          {!p.in_stock && (
            <span className="absolute inset-x-3 bottom-3 rounded-full bg-tt-ink/85 py-1.5 text-center text-xs font-semibold text-white">
              Back soon
            </span>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4 pr-16">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tt-soft">{brandOf(p.brand).name}</span>
        <Link to="/product/$id" params={{ id: p.id }} className="text-[15px] font-semibold leading-snug text-tt-ink hover:text-tt-leaf">
          {p.name}
        </Link>
        <span className="mt-auto pt-1 text-[15px] font-bold text-tt-leafdeep">{mvr(p.price)}</span>
      </div>
      <button
        type="button"
        disabled={!p.in_stock}
        onClick={() => add(p, 1)}
        aria-label={`Add ${p.name} to cart`}
        className="tt-pop absolute bottom-4 right-4 grid h-11 w-11 place-items-center rounded-full bg-tt-leaf text-white shadow-[0_8px_18px_-8px_rgba(27,128,83,0.8)] transition-colors hover:bg-tt-leafdeep disabled:cursor-not-allowed disabled:bg-tt-line disabled:text-tt-soft"
      >
        <IconPlus size={20} />
      </button>
    </article>
  );
}
