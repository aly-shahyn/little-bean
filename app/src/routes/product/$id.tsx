import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";

import { lines, mvr, normalizePhone, bundleItems } from "../../lib/catalog";
import { useShop } from "../../lib/use-shop";
import { useCart } from "../../lib/cart";
import { getShop } from "../../lib/shop.functions";
import { BundlesGrid } from "../../components/tt/bundles";
import { ProductCard } from "../../components/tt/product-card";
import { SaveHeart } from "../../components/tt/save-heart";
import { IconArrow, IconCheck, IconMinus, IconPlus } from "../../components/tt/icons";

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => {
    const { products } = await getShop();
    const product = products.find((p) => p.id === params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    if (!p) return {};
    return {
      meta: [
        { title: `${p.name} | Little Bean` },
        { name: "description", content: p.short },
        { property: "og:title", content: `${p.name} | Little Bean` },
        { property: "og:description", content: p.short },
      ],
      links: [{ rel: "canonical", href: `https://tinnytummies.higgsfield.app/product/${p.id}` }],
    };
  },
  component: ProductPage,
});


function Acc({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="tt-acc group border-b border-tt-line py-1" open={open}>
      <summary className="flex items-center justify-between py-4 text-[16px] font-semibold">
        {title}
        <span className="tt-acc-plus grid h-8 w-8 place-items-center rounded-full bg-white ring-1 ring-tt-line"><IconPlus size={15} /></span>
      </summary>
      <div className="pb-5 text-[15px] leading-relaxed text-tt-ink/80">{children}</div>
    </details>
  );
}

function ProductPage() {
  const { product: p } = Route.useLoaderData();
  const { products, settings, brandOf, categoryOf, pairs, bundles } = useShop();
  const live = products.find((x) => x.id === p.id) ?? p;
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const cat = categoryOf(live.category);
  const brand = brandOf(live.brand);
  const related = products.filter((x) => x.category === live.category && x.id !== live.id).slice(0, 4);
  const together = [...new Map([...(pairs?.[live.id] ?? []).map((id) => products.find((x) => x.id === id)), ...products.filter((x) => x.category !== live.category && (x.age === live.age || x.age === "Family"))].filter((x): x is (typeof products)[number] => !!x && x.id !== live.id && !!x.in_stock && !related.some((r) => r.id === x.id)).map((x) => [x.id, x])).values()].slice(0, 4);
  const withThis = bundles.filter((b) => bundleItems(b).some((it) => it.id === live.id));
  const ingredients = lines(live.ingredients);
  const highlights = lines(live.highlights);
  const wa = normalizePhone(settings.whatsapp || "");
  const askText = encodeURIComponent(`Hi Little Bean! I have a question about ${live.name}.`);

  return (
    <div>
      <div className="tt-wrap pt-6">
        <nav className="text-sm text-tt-soft" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-tt-ink">Home</Link>
          <span className="mx-1.5">/</span>
          <Link to="/shop" search={{ category: cat.id }} className="hover:text-tt-ink">{cat.name}</Link>
          <span className="mx-1.5">/</span>
          <span className="text-tt-ink">{live.name}</span>
        </nav>
      </div>

      <section data-fly-card className="tt-wrap grid gap-8 pt-6 md:grid-cols-2 md:gap-14">
        <div className="tt-rise md:sticky md:top-24 md:self-start">
          <div className="relative overflow-hidden rounded-[36px]" style={{ background: cat.tint }}>
            <SaveHeart id={live.id} big className="absolute right-4 top-4 z-10" />
            <img src={live.image} alt={live.name} className="aspect-[4/5] w-full object-cover transition-transform duration-700 hover:scale-[1.04]" />
          </div>
        </div>

        <div className="pb-4">
          <Link to="/shop" search={{ brand: brand.id }} className="tt-rise text-[13px] font-bold uppercase tracking-[0.1em] text-tt-leaf hover:underline">
            {brand.name}
          </Link>
          <h1 className="tt-display tt-rise tt-d1 mt-2 text-[2.1rem] font-extrabold leading-[1.05] sm:text-5xl">{live.name}</h1>
          <p className="tt-rise tt-d2 mt-3 text-[17px] text-tt-soft">{live.short}</p>
          <div className="tt-rise tt-d2 mt-5 flex flex-wrap gap-2 text-[13px] font-semibold">
            <span className="rounded-full px-3 py-1.5" style={{ background: cat.tint, color: cat.ink }}>{live.age === "Family" ? "For the whole family" : `Age ${live.age}`}</span>
            {live.weight ? <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-tt-line">{live.weight}</span> : null}
            {live.in_stock ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-tt-sage px-3 py-1.5 text-tt-mintdeep"><IconCheck size={14} /> In stock</span>
            ) : (
              <span className="rounded-full bg-tt-blush px-3 py-1.5 text-[#8C2F45]">Back soon</span>
            )}
          </div>

          <p className="tt-display tt-rise tt-d3 mt-7 text-4xl font-extrabold text-tt-leafdeep">{mvr(live.price)}</p>

          <div className="tt-rise tt-d3 mt-5 flex gap-3">
            <div className="flex h-14 items-center rounded-2xl bg-white ring-1 ring-tt-line">
              <button type="button" className="grid h-14 w-12 place-items-center" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity"><IconMinus size={17} /></button>
              <span className="w-8 text-center text-lg font-bold" aria-live="polite">{qty}</span>
              <button type="button" className="grid h-14 w-12 place-items-center" onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="Increase quantity"><IconPlus size={17} /></button>
            </div>
            <button
              type="button"
              disabled={!live.in_stock}
              onClick={() => add(live, qty)}
              className="tt-pop flex h-14 flex-1 items-center justify-center gap-3 rounded-2xl bg-tt-leaf text-[16px] font-semibold text-white transition-colors hover:bg-tt-leafdeep disabled:bg-tt-line disabled:text-tt-soft"
            >
              {live.in_stock ? `Add to basket, ${mvr(live.price * qty)}` : "Currently unavailable"}
            </button>
          </div>
          {wa ? (
            <a href={`https://wa.me/${wa}?text=${askText}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-tt-leaf underline underline-offset-4">
              Ask us about this product on WhatsApp
            </a>
          ) : null}

          {highlights.length ? (
            <ul className="mt-8 grid gap-2.5 rounded-[28px] bg-white p-6 ring-1 ring-tt-line sm:grid-cols-2">
              {highlights.map((h) => (
                <li key={h} className="flex items-start gap-2.5 text-[14.5px]">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-tt-sage text-tt-mintdeep"><IconCheck size={13} /></span>
                  {h}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-6">
            <Acc title="About this product" open>{live.description}</Acc>
            <Acc title="Ingredients">
              {ingredients.length ? (
                <ul className="list-disc space-y-1 pl-5">{ingredients.map((i) => <li key={i}>{i}</li>)}</ul>
              ) : (
                <p>The full ingredient list is printed on the pack. Message us and we'll send you a photo of the label.</p>
              )}
            </Acc>
            <Acc title="Allergy information">
              <p>{live.allergy || "Please check the pack for allergy information, or message us for a label photo."}</p>
            </Acc>
            {live.serve ? <Acc title="How to serve">{live.serve}</Acc> : null}
            <Acc title="Delivery and payment">
              <p>{settings.delivery_note}</p>
              <p className="mt-2">Order on WhatsApp or Viber, or pay by BML bank transfer at checkout. Instant purchase only. No refund, no return.</p>
            </Acc>
          </div>
        </div>
      </section>

      {withThis.length ? (
        <section className="tt-wrap pt-20">
          <h2 className="tt-display text-3xl font-bold">Save with a bundle</h2>
          <BundlesGrid list={withThis} />
        </section>
      ) : null}

      {together.length ? (
        <section className="tt-wrap pt-20">
          <h2 className="tt-display text-3xl font-bold">Frequently bought together</h2>
          <p className="mt-1 text-tt-soft">Mamas who picked this also added these.</p>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {together.map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      ) : null}

      {related.length ? (
        <section className="tt-wrap pt-20">
          <div className="flex items-end justify-between gap-4">
            <h2 className="tt-display text-3xl font-bold">More {cat.name.toLowerCase()}</h2>
            <Link to="/shop" search={{ category: cat.id }} className="inline-flex items-center gap-2 font-semibold text-tt-leaf">See all <span className="tt-arrow"><IconArrow size={16} /></span></Link>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {related.map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
