import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AGES } from "../../lib/catalog";
import { useShop } from "../../lib/use-shop";
import { IconArrow } from "./icons";

const AGE_NOTE: Record<string, string> = { "6m+": "First tastes", "7m+": "Little nibbler", "9m+": "Busy snacker", "12m+": "Toddler meals" };
const SHORT: Record<string, string> = { "6m+": "6 mo", "7m+": "7 mo", "9m+": "9 mo", "12m+": "12 mo+" };

/** Compact hero finder: tap an age, tap what you need, go to the filtered shop. */
export function AgeFinder() {
  const { products, categories } = useShop();
  const navigate = useNavigate();
  const [age, setAge] = useState<string>("");
  const [cat, setCat] = useState<string>("");

  const matches = useMemo(() => products.filter((p) => (!age || p.age === age) && (!cat || p.category === cat)).length, [products, age, cat]);
  const cats = useMemo(() => categories.filter((c) => products.some((p) => p.category === c.id && (!age || p.age === age))), [categories, products, age]);
  const idx = AGES.findIndex((a) => a.id === age);

  const go = () => void navigate({ to: "/shop", search: { ...(age ? { age } : {}), ...(cat ? { category: cat } : {}) } });

  return (
    <div className="tt-finder2">
      <p className="flex items-baseline justify-between gap-3 text-[13px] font-bold text-tt-ink">
        <span>How old is your little one?</span>
        <span key={age} className="tt-finder-note text-xs font-semibold text-tt-leafdeep">{age ? AGE_NOTE[age] : "Tap an age"}</span>
      </p>

      <div className="tt-seg mt-2" role="radiogroup" aria-label="Baby's age" style={{ ["--i" as string]: Math.max(0, idx), ["--n" as string]: AGES.length }}>
        <span className={`tt-seg-pill ${idx >= 0 ? "is-on" : ""}`} aria-hidden="true" />
        {AGES.map((a) => (
          <button key={a.id} type="button" role="radio" aria-checked={age === a.id} aria-label={a.label} onClick={() => { setAge(age === a.id ? "" : a.id); setCat(""); }} className={age === a.id ? "is-on" : ""}>
            {SHORT[a.id] ?? a.id}
          </button>
        ))}
      </div>

      <div className="tt-finder-chips mt-3" role="radiogroup" aria-label="What to buy">
        <button type="button" role="radio" aria-checked={!cat} onClick={() => setCat("")} className={!cat ? "is-on" : ""}>Everything</button>
        {cats.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={cat === c.id} onClick={() => setCat(cat === c.id ? "" : c.id)} className={cat === c.id ? "is-on" : ""}>
            <i style={{ background: c.tint }} />{c.name}
          </button>
        ))}
      </div>

      <div className="mt-3.5 flex items-center gap-4">
        <button type="button" onClick={go} disabled={!matches} className="tt-finder-go">
          <span>{matches ? <>Show <b key={matches} className="tt-finder-count">{matches}</b> {matches === 1 ? "product" : "products"}</> : "Nothing here yet"}</span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-tt-leafdeep"><span className="tt-arrow"><IconArrow size={16} /></span></span>
        </button>
        <Link to="/shop" className="text-sm font-semibold text-tt-soft underline decoration-tt-coral decoration-2 underline-offset-4 hover:text-tt-leaf">Browse all</Link>
      </div>
    </div>
  );
}
