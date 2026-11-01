import { Link, createFileRoute } from "@tanstack/react-router";

import { useShop } from "../lib/use-shop";
import { ProductCard } from "../components/tt/product-card";
import { Reveal } from "../components/tt/reveal";
import { CareBand, HowToOrder, MealsAndInstagram } from "../components/tt/home-sections";
import { FamilyFilm } from "../components/tt/family-film";
import "../components/tt/refinement.css";
import { AgeFinder } from "../components/tt/age-finder";
import { CategoryFloat } from "../components/tt/category-float";
import { BundlesGrid } from "../components/tt/bundles";
import { BrandStrip } from "../components/tt/home-sections";
import { IconArrow, IconLeaf } from "../components/tt/icons";

export const Route = createFileRoute("/")({
  head: () => ({ links: [{ rel: "canonical", href: "https://tinnytummies.higgsfield.app/" }] }),
  component: Home,
});

function Home() {
  const { products, categories, t, bundles } = useShop();
  const featured = products.filter((p) => p.featured).slice(0, 8);

  return (
    <>
      <section className="tt-home-hero">
        <div className="tt-wrap tt-hero-grid">
          <div className="tt-hero-copy">
            <p className="tt-rise tt-hero-eyebrow">
              <IconLeaf size={15} /> {t("hero_eyebrow")}
            </p>
            <h1 className="tt-display tt-rise tt-d1 tt-hero-title">
              {t("hero_title")}{" "}
              <span className="tt-hero-highlight">
                {t("hero_highlight")}
              </span>
            </h1>
            <p className="tt-rise tt-d2 tt-hero-description">Little favourites from brands you trust. Find their next happy bite, from first spoonfuls to toddler snacks.</p>
            <div className="tt-rise tt-d3 mt-7"><AgeFinder /></div>
          </div>
          <div className="tt-rise tt-d2 tt-hero-media">
            <FamilyFilm />
          </div>
        </div>
      </section>

      <BrandStrip />

      <section className="tt-wrap pt-24">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="tt-display text-3xl font-bold sm:text-[2.6rem]">{t("cats_title")}</h2>
            <p className="mt-2 text-tt-soft">{t("cats_text")}</p>
          </div>
          <Link to="/shop" className="inline-flex items-center gap-2 font-semibold text-tt-leaf">See everything <span className="tt-arrow"><IconArrow size={16} /></span></Link>
        </Reveal>
        <Reveal className="mt-6"><CategoryFloat categories={categories} products={products} /></Reveal>
      </section>

      {featured.length ? (
        <section className="tt-wrap pt-24">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="tt-display text-3xl font-bold sm:text-[2.6rem]">{t("fav_title")}</h2>
              <p className="mt-2 text-tt-soft">{t("fav_text")}</p>
            </div>
            <Link to="/shop" className="inline-flex items-center gap-2 font-semibold text-tt-leaf">Shop all <span className="tt-arrow"><IconArrow size={16} /></span></Link>
          </Reveal>
          <div className="mt-9 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {featured.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      ) : null}

      {bundles.length ? (
        <section id="deals" className="tt-wrap scroll-mt-24 pt-24">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex rounded-full bg-tt-coral/15 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[#B4492F]">Save more</p>
              <h2 className="tt-display mt-3 text-3xl font-bold sm:text-[2.6rem]">Bundles &amp; super saver deals</h2>
              <p className="mt-2 text-tt-soft">Mama-approved sets for less. Add the whole bundle in one tap.</p>
            </div>
          </Reveal>
          <BundlesGrid list={bundles} />
        </section>
      ) : null}

      <section className="tt-wrap pt-24">
        <Reveal className="grid items-center overflow-hidden rounded-[36px] bg-tt-sage md:grid-cols-2">
          <img src={t("snack_image")} alt="" loading="lazy" className="h-full max-h-[560px] w-full object-cover" />
          <div className="p-8 sm:p-12">
            <p className="text-sm font-semibold text-tt-leafdeep">{t("snack_label")}</p>
            <h2 className="tt-display mt-2 text-3xl font-bold sm:text-5xl">{t("snack_title")}</h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-tt-ink/75">{t("snack_text")}</p>
            <Link to="/shop" search={{ category: t("snack_category") }} className="mt-7 inline-flex items-center gap-3 rounded-full border-2 border-tt-leafdeep px-6 py-3 font-semibold text-tt-leafdeep transition-colors hover:bg-tt-leafdeep hover:text-white">
              {t("snack_cta")} <span className="tt-arrow"><IconArrow size={17} /></span>
            </Link>
          </div>
        </Reveal>
      </section>

      <HowToOrder />
      <CareBand />
      <MealsAndInstagram />
    </>
  );
}
