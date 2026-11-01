import { Link } from "@tanstack/react-router";

import { useShop } from "../../lib/use-shop";
import { IconArrow, IconBank, IconHeart, IconInstagram, IconLeaf, IconShield, IconTruck, IconUser } from "./icons";
import { Reveal } from "./reveal";

export function BrandsSection() {
  const { brands, products, t } = useShop();
  return (
    <section className="tt-wrap pt-24">
      <Reveal>
        <h2 className="tt-display text-3xl font-bold sm:text-[2.6rem]">{t("brands_title")}</h2>
        <p className="mt-2 text-tt-soft">{t("brands_text")}</p>
      </Reveal>
      <ul className="mt-8 divide-y divide-tt-line border-y border-tt-line">
        {brands.map((b) => (
          <li key={b.id}>
            <Link to="/shop" search={{ brand: b.id }} className="group grid items-center gap-2 py-5 sm:grid-cols-[1.1fr_2fr_auto] sm:gap-8">
              <span className="tt-display text-2xl font-bold transition-colors group-hover:text-tt-leaf sm:text-3xl">{b.name}</span>
              <span className="text-[14.5px] text-tt-soft">{b.about}</span>
              <span className="inline-flex items-center gap-3 text-sm font-semibold text-tt-ink">
                {b.origin ? <span className="rounded-full bg-white px-3 py-1 ring-1 ring-tt-line">{b.origin}</span> : null}
                {products.filter((p) => p.brand === b.id).length} items <span className="tt-arrow text-tt-leaf"><IconArrow size={16} /></span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}


const STEP_3D = ["/assets/3d/step-account.webp", "/assets/3d/step-basket.webp", "/assets/3d/step-confirm.webp", "/assets/3d/step-deliver.webp"];
const STEP_TINTS = ["#FFD6C7", "#FFE9A8", "#D8F3E3", "#CDEBFF"];

export function HowToOrder() {
  const { t } = useShop();
  return (
    <section className="tt-wrap pt-24">
      <div className="grid items-center gap-10 md:grid-cols-[1fr_1.1fr]">
        <Reveal className="relative">
          <img src={t("how_image")} alt="" loading="lazy" className="aspect-[4/5] w-full rounded-[36px] object-cover" />
          <div className="absolute -bottom-5 right-5 rounded-2xl bg-white px-5 py-4 shadow-[0_18px_40px_-20px_rgba(42,36,64,0.45)]">
            <p className="tt-display text-lg font-bold">{t("how_badge_title")}</p>
            <p className="text-sm text-tt-soft">{t("how_badge_text")}</p>
          </div>
        </Reveal>
        <Reveal>
          <h2 className="tt-display text-3xl font-bold sm:text-[2.6rem]">{t("how_title")}</h2>
          <ol className="mt-8 space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <li key={i} className="flex items-center gap-5">
                <span className="group/step relative grid h-[72px] w-[72px] shrink-0 place-items-center rounded-[22px]" style={{ background: STEP_TINTS[i - 1] }}>
                  <img src={STEP_3D[i - 1]} alt="" loading="lazy" className="h-[60px] w-[60px] object-contain drop-shadow-[0_8px_10px_rgba(42,36,64,0.15)] transition-transform duration-500 group-hover/step:-translate-y-1 group-hover/step:rotate-[-4deg]" />
                  <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white text-[12px] font-bold text-tt-ink shadow-sm ring-1 ring-tt-line">{i}</span>
                </span>
                <div>
                  <p className="tt-display text-xl font-bold">{t(`step${i}_title`)}</p>
                  <p className="mt-1 text-tt-soft">{t(`step${i}_text`)}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link to="/account" className="mt-8 inline-flex items-center gap-2 font-semibold text-tt-leaf underline decoration-2 underline-offset-4">
            Create your account <span className="tt-arrow"><IconArrow size={16} /></span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function IconCircleCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.3 2.4 2.4 4.6-4.9" />
    </svg>
  );
}

export function CareBand() {
  const { t } = useShop();
  const icons = [<IconLeaf size={20} key="l" />, <IconShield size={20} key="s" />, <IconHeart size={20} key="h" />, <IconCircleCheck key="c" />];
  return (
    <section className="pt-28">
      <div className="relative overflow-hidden">
        <img src={t("care_image")} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-tt-milk via-tt-milk/85 to-tt-milk/10" />
        <div className="tt-wrap relative py-20 sm:py-28">
          <Reveal className="max-w-xl">
            <h2 className="tt-display text-3xl font-bold sm:text-5xl">{t("care_title")}</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <li key={i} className="rounded-3xl bg-white/90 p-5 backdrop-blur">
                  <span className="text-tt-leaf">{icons[i - 1]}</span>
                  <p className="mt-2 font-semibold">{t(`care${i}_title`)}</p>
                  <p className="text-sm text-tt-soft">{t(`care${i}_text`)}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function MealsAndInstagram() {
  const { settings, t } = useShop();
  const handle = settings.instagram || "tinnytummiesmv";
  return (
    <section className="tt-wrap pt-24">
      <div className="grid gap-5 md:grid-cols-2">
        <Reveal className="relative overflow-hidden rounded-[36px] bg-tt-blush">
          <img src={t("meals_image")} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover" />
          <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-3xl bg-white/95 p-5 backdrop-blur">
            <div>
              <p className="tt-display text-xl font-bold">{t("meals_title")}</p>
              <p className="text-sm text-tt-soft">{t("meals_text")}</p>
            </div>
            <Link to="/shop" search={{ category: t("meals_category") }} aria-label={t("meals_title")} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-tt-coral text-tt-ink">
              <span className="tt-arrow"><IconArrow size={18} /></span>
            </Link>
          </div>
        </Reveal>
        <Reveal className="flex flex-col justify-between rounded-[36px] bg-tt-lilac p-8 sm:p-10">
          <div>
            <IconInstagram size={34} className="text-[#4D3A86]" />
            <h2 className="tt-display mt-5 text-3xl font-bold sm:text-4xl">{t("insta_title")}</h2>
            <p className="mt-3 max-w-sm text-tt-ink/75">{t("insta_text")}</p>
          </div>
          <a href={`https://www.instagram.com/${handle}/`} target="_blank" rel="noreferrer" className="mt-8 inline-flex w-fit items-center gap-3 rounded-2xl bg-[#4D3A86] px-6 py-4 font-semibold text-white transition-transform hover:-translate-y-0.5">
            @{handle} <span className="tt-arrow"><IconArrow size={17} /></span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}


/**
 * Endless strip of brand logos (display only, not links). Three identical tracks slide side by side,
 * each only one set wide: very wide animated layers get partly unpainted on iPhone Safari, which made
 * logos vanish. Images load eagerly so they are ready before they slide into view.
 */
export function BrandStrip() {
  const { brands: all, t } = useShop();
  const brands = all.filter((b) => b.logo);
  if (!brands.length) return null;
  const label = t("brands_strip_label");
  const set: typeof brands = [];
  while (set.length < 5) set.push(...brands); // two sets must cover the widest screen
  const dur = `${Math.max(18, set.length * 4.5)}s`;
  return (
    <section className="relative border-y border-tt-line bg-[linear-gradient(180deg,#FFFFFF_0%,#F6FAF3_100%)] py-6" aria-label={label || "Brands we love"}>
      {label ? <p className="mb-4 text-center text-[12px] font-bold uppercase tracking-[0.18em] text-tt-soft">{label}</p> : null}
      <div className="tt-brand-strip relative flex overflow-hidden">
        {[0, 1, 2].map((track) => (
          <ul key={track} className="tt-brand-track flex shrink-0 items-center py-2" style={{ ["--dur" as string]: dur }} aria-hidden={track > 0 ? true : undefined}>
            {set.map((b, i) => (
              <li key={`${b.id}-${i}`} className="mx-2.5 flex h-[84px] w-[190px] shrink-0 select-none items-center justify-center rounded-[22px] bg-white px-6 shadow-[0_10px_24px_-18px_rgba(42,36,64,0.45)] ring-1 ring-tt-line">
                <img src={b.logo} alt={track === 0 && i < brands.length ? b.name : ""} loading="eager" decoding="async" draggable={false} width={160} height={50} className="pointer-events-none h-[50px] w-auto max-w-[150px] object-contain" />
              </li>
            ))}
          </ul>
        ))}
        {/* Soft edges as overlays (a CSS mask over a moving strip flickers on iPhone). */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#F9FCF7] to-transparent sm:w-20" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#F9FCF7] to-transparent sm:w-20" />
      </div>
    </section>
  );
}
