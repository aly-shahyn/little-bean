import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { AGES } from "../lib/catalog";
import { useShop } from "../lib/use-shop";
import { BundlesGrid } from "../components/tt/bundles";
import { ProductCard } from "../components/tt/product-card";
import { IconClose, IconSearch } from "../components/tt/icons";

type ShopSearch = { category?: string; brand?: string; age?: string; q?: string; sort?: string };

const str = (v: unknown) => (typeof v === "string" && v.length < 80 ? v : undefined);

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>): ShopSearch => ({
    category: str(s.category),
    brand: str(s.brand),
    age: str(s.age),
    q: str(s.q),
    sort: str(s.sort),
  }),
  head: () => ({
    meta: [
      { title: "Shop baby food | Little Bean" },
      { name: "description", content: "Browse porridge, oats, rice puffs, sticks, pasta and fruit pouches by age, brand and category." },
    ],
    links: [{ rel: "canonical", href: "https://tinnytummies.higgsfield.app/shop" }],
  }),
  component: Shop,
});


function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold transition-colors ${active ? "bg-tt-ink text-white" : "bg-white text-tt-ink ring-1 ring-tt-line hover:ring-tt-ink/40"}`}
    >
      {children}
    </button>
  );
}

function Shop() {
  const { products, brands, categories, brandOf, categoryOf, t, bundles } = useShop();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const [q, setQ] = useState(search.q ?? "");
  useEffect(() => setQ(search.q ?? ""), [search.q]);

  const set = (patch: Partial<ShopSearch>) =>
    navigate({ search: (prev: ShopSearch) => ({ ...prev, ...patch }), replace: true, resetScroll: false });

  useEffect(() => {
    const t = setTimeout(() => {
      if ((search.q ?? "") !== q) set({ q: q || undefined });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const list = useMemo(() => {
    const needle = (search.q ?? "").trim().toLowerCase();
    let out = products.filter(
      (p) =>
        (!search.category || p.category === search.category) &&
        (!search.brand || p.brand === search.brand) &&
        (!search.age || p.age === search.age) &&
        (!needle || `${p.name} ${brandOf(p.brand).name} ${categoryOf(p.category).name} ${p.short}`.toLowerCase().includes(needle)),
    );
    if (search.sort === "low") out = [...out].sort((a, b) => a.price - b.price);
    else if (search.sort === "high") out = [...out].sort((a, b) => b.price - a.price);
    else if (search.sort === "name") out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    else out = [...out].sort((a, b) => b.in_stock - a.in_stock || b.featured - a.featured || a.sort - b.sort);
    return out;
  }, [products, search]);

  const cat = search.category ? categoryOf(search.category) : null;
  const brand = search.brand ? brandOf(search.brand) : null;
  const title = cat?.name ?? brand?.name ?? (search.age ? `For ${AGES.find((a) => a.id === search.age)?.label ?? search.age}` : t("shop_title"));
  const hasFilters = !!(search.category || search.brand || search.age || search.q);

  return (
    <div>
      <section className="border-b border-tt-line" style={{ background: cat?.tint ?? "#fff" }}>
        <div className="tt-wrap py-10 sm:py-14">
          <nav className="text-sm text-tt-soft" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-tt-ink">Home</Link> <span className="mx-1.5">/</span> <span className="text-tt-ink">Shop</span>
          </nav>
          <h1 className="tt-display tt-rise mt-3 text-4xl font-extrabold sm:text-6xl">{title}</h1>
          <p className="tt-rise tt-d1 mt-2 max-w-xl text-tt-ink/70">
            {cat?.blurb ?? brand?.about ?? t("shop_text")}
          </p>
          <div className="tt-rise tt-d2 relative mt-6 max-w-xl">
            <IconSearch size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-tt-soft" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search oats, puffs, banana..."
              aria-label="Search products"
              className="h-13 w-full rounded-full bg-white py-3.5 pl-11 pr-11 text-[15.5px] outline-none ring-1 ring-tt-line focus:ring-2 focus:ring-tt-leaf"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full hover:bg-tt-milk" aria-label="Clear search">
                <IconClose size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="sticky top-[68px] z-30 border-b border-tt-line bg-tt-milk/95 backdrop-blur">
        <div className="tt-wrap flex flex-col gap-2.5 py-3">
          <div className="tt-noscroll -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
            <Chip active={!search.category} onClick={() => set({ category: undefined })}>All</Chip>
            {categories.map((c) => (
              <Chip key={c.id} active={search.category === c.id} onClick={() => set({ category: search.category === c.id ? undefined : c.id })}>{c.name}</Chip>
            ))}
          </div>
          <div className="tt-noscroll -mx-5 flex items-center gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
            {AGES.map((a) => (
              <Chip key={a.id} active={search.age === a.id} onClick={() => set({ age: search.age === a.id ? undefined : a.id })}>{a.id}</Chip>
            ))}
            <span className="mx-1 h-6 w-px shrink-0 bg-tt-line" />
            <select
              value={search.brand ?? ""}
              onChange={(e) => set({ brand: e.target.value || undefined })}
              aria-label="Filter by brand"
              className="h-10 shrink-0 rounded-full bg-white px-4 text-[14px] font-semibold ring-1 ring-tt-line"
            >
              <option value="">All brands</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select
              value={search.sort ?? ""}
              onChange={(e) => set({ sort: e.target.value || undefined })}
              aria-label="Sort products"
              className="h-10 shrink-0 rounded-full bg-white px-4 text-[14px] font-semibold ring-1 ring-tt-line"
            >
              <option value="">Recommended</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
              <option value="name">Name A to Z</option>
            </select>
          </div>
        </div>
      </div>

      <section className="tt-wrap pt-8">
        <div className="mb-5 flex items-center justify-between text-sm text-tt-soft">
          <span>{list.length} {list.length === 1 ? "product" : "products"}</span>
          {hasFilters && (
            <button type="button" onClick={() => navigate({ search: {}, replace: true })} className="font-semibold text-tt-leaf underline underline-offset-4">
              Clear filters
            </button>
          )}
        </div>
        {list.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {list.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        ) : (
          <div className="rounded-[32px] bg-white p-12 text-center ring-1 ring-tt-line">
            <p className="tt-display text-2xl font-bold">Nothing matches yet</p>
            <p className="mt-2 text-tt-soft">Try another age or brand, or clear your filters.</p>
          </div>
        )}
        {bundles.filter((b) => !search.age || !b.age || b.age === search.age).length && !search.q && !search.brand ? (
          <div className="mt-16">
            <h2 className="tt-display text-2xl font-bold sm:text-3xl">Bundles &amp; super saver deals</h2>
            <BundlesGrid list={bundles.filter((b) => !search.age || !b.age || b.age === search.age)} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
