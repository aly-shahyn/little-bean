import { Link, createFileRoute } from "@tanstack/react-router";

import { useShop } from "../lib/use-shop";
import { HowToOrder } from "../components/tt/home-sections";
import { Reveal } from "../components/tt/reveal";
import { IconArrow, IconPlus } from "../components/tt/icons";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About and how to order | Little Bean" },
      { name: "description", content: "How ordering, payment and delivery work at Little Bean, the baby food store in the Maldives." },
    ],
    links: [{ rel: "canonical", href: "https://tinnytummies.higgsfield.app/about" }],
  }),
  component: About,
});

function About() {
  const { t } = useShop();
  const faqs = [1, 2, 3, 4, 5, 6].map((i) => ({ q: t(`faq${i}_q`), a: t(`faq${i}_a`) })).filter((f) => f.q && f.a);
  return (
    <div>
      <section className="tt-wrap grid items-center gap-10 pt-10 md:grid-cols-[1.1fr_1fr] md:pt-16">
        <div>
          <p className="tt-rise text-sm font-semibold text-tt-leaf">{t("about_eyebrow")}</p>
          <h1 className="tt-display tt-rise tt-d1 mt-3 text-5xl font-extrabold leading-[1.02] sm:text-6xl">{t("about_title")}</h1>
          <p className="tt-rise tt-d2 mt-6 max-w-xl whitespace-pre-line text-[17px] leading-relaxed text-tt-ink/75">{t("about_text")}</p>
          <Link to="/shop" className="tt-rise tt-d3 mt-8 inline-flex h-14 items-center gap-3 rounded-full bg-tt-ink pl-7 pr-2 font-semibold text-white">
            Start shopping
            <span className="grid h-10 w-10 place-items-center rounded-full bg-tt-peach text-tt-ink"><span className="tt-arrow"><IconArrow size={18} /></span></span>
          </Link>
        </div>
        <div className="tt-rise tt-arch mx-auto aspect-[4/5] w-full max-w-[460px] bg-tt-sage">
          <img src={t("about_image")} alt="" className="h-full w-full object-cover" />
        </div>
      </section>

      <HowToOrder />

      {faqs.length ? (
        <section id="faq" className="tt-wrap scroll-mt-24 pt-24">
          <Reveal>
            <h2 className="tt-display text-3xl font-bold sm:text-[2.6rem]">{t("faq_title")}</h2>
          </Reveal>
          <div className="mt-8 max-w-3xl">
            {faqs.map((f, i) => (
              <details key={f.q} className="tt-acc border-b border-tt-line" open={i === 0}>
                <summary className="flex items-center justify-between gap-4 py-5 text-[17px] font-semibold">
                  {f.q}
                  <span className="tt-acc-plus grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white ring-1 ring-tt-line"><IconPlus size={16} /></span>
                </summary>
                <p className="whitespace-pre-line pb-6 text-[15.5px] leading-relaxed text-tt-ink/75">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
