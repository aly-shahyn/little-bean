import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Category, Product } from "../../lib/catalog";
import { IconArrow } from "./icons";

// Ready-made cut-outs for the original sample photos. Any image uploaded in admin is used as-is:
// a transparent PNG/WebP floats (its empty margins are trimmed), a normal photo shows in a soft circle.
const SAMPLE_CUTOUT: Record<string, string> = {
  "/assets/samples/porridge.jpg": "/assets/cutouts/porridge.webp",
  "/assets/samples/oats.jpg": "/assets/cutouts/oats.webp",
  "/assets/samples/snacks.jpg": "/assets/cutouts/snacks.webp",
  "/assets/samples/pasta.jpg": "/assets/cutouts/pasta.webp",
  "/assets/samples/pouches.jpg": "/assets/cutouts/pouches.webp",
};

type Art = { url: string; mode: "cutout" | "photo" | "loading" };
const artCache = new Map<string, Art>();

/** Works out how to show a category image: trims a transparent image to its product, or marks it as a photo. */
function useArt(src: string): Art {
  const known = SAMPLE_CUTOUT[src] ? { url: SAMPLE_CUTOUT[src]!, mode: "cutout" as const } : artCache.get(src);
  const [art, setArt] = useState<Art>(known ?? { url: src, mode: src ? "loading" : "photo" });
  useEffect(() => {
    if (!src) return setArt({ url: "", mode: "photo" });
    const hit = SAMPLE_CUTOUT[src] ? { url: SAMPLE_CUTOUT[src]!, mode: "cutout" as const } : artCache.get(src);
    if (hit) return setArt(hit);
    let alive = true;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      try {
        const nw = img.naturalWidth, nh = img.naturalHeight;
        const k = Math.min(1, 160 / Math.max(nw, nh));
        const sw = Math.max(1, Math.round(nw * k)), sh = Math.max(1, Math.round(nh * k));
        const probe = document.createElement("canvas");
        probe.width = sw; probe.height = sh;
        const pc = probe.getContext("2d", { willReadFrequently: true })!;
        pc.drawImage(img, 0, 0, sw, sh);
        const px = pc.getImageData(0, 0, sw, sh).data;
        const alpha = (x: number, y: number) => px[(y * sw + x) * 4 + 3]!;
        const transparent = [alpha(0, 0), alpha(sw - 1, 0), alpha(0, sh - 1), alpha(sw - 1, sh - 1)].filter((a) => a < 16).length >= 3;
        if (!transparent) { const r = { url: src, mode: "photo" as const }; artCache.set(src, r); if (alive) setArt(r); return; }
        let x0 = sw, y0 = sh, x1 = -1, y1 = -1;
        for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) if (alpha(x, y) > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 < 0) { const r = { url: src, mode: "cutout" as const }; artCache.set(src, r); if (alive) setArt(r); return; }
        // Crop the full-size image to the product plus a small margin, capped at 900px.
        const pad = 0.04;
        const cx0 = Math.max(0, (x0 / sw - pad) * nw), cy0 = Math.max(0, (y0 / sh - pad) * nh);
        const cx1 = Math.min(nw, ((x1 + 1) / sw + pad) * nw), cy1 = Math.min(nh, ((y1 + 1) / sh + pad) * nh);
        const cw = cx1 - cx0, ch = cy1 - cy0;
        const s2 = Math.min(1, 900 / Math.max(cw, ch));
        const out = document.createElement("canvas");
        out.width = Math.round(cw * s2); out.height = Math.round(ch * s2);
        out.getContext("2d")!.drawImage(img, cx0, cy0, cw, ch, 0, 0, out.width, out.height);
        out.toBlob((blob) => {
          const r = { url: blob ? URL.createObjectURL(blob) : src, mode: "cutout" as const };
          artCache.set(src, r);
          if (alive) setArt(r);
        }, "image/webp", 0.9);
      } catch {
        const r = { url: src, mode: "cutout" as const };
        if (alive) setArt(r);
      }
    };
    img.onerror = () => { if (alive) setArt({ url: src, mode: "photo" }); };
    img.src = src;
    return () => { alive = false; };
  }, [src]);
  return art;
}

function CategoryArt({ cat }: { cat: Category }) {
  const art = useArt(cat.image || "");
  const img = art.url ? <img src={art.url} alt="" draggable={false} /> : null;
  const body = art.mode === "photo"
    ? <span className="tt-cf-photo" style={{ background: cat.tint }}>{img}</span>
    : <span className={`tt-cf-cut ${art.mode === "loading" ? "is-loading" : ""}`}>{img}</span>;
  return (
    <>
      <span className="tt-cf-sharp">{body}</span>
      <span className="tt-cf-soft" aria-hidden="true">{body}</span>
    </>
  );
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Floating category carousel. The ring position `pos` is continuous: dragging moves it with the finger,
 *  releasing glides it to the nearest product. Only transform and opacity animate (GPU-smooth), and the
 *  blur is a cross-fade between a sharp and a pre-blurred copy, so nothing is re-blurred mid-flight. */
export function CategoryFloat({ categories, products }: { categories: Category[]; products: Product[] }) {
  const n = categories.length;
  const [pos, setPos] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [touched, setTouched] = useState(false);
  const [hover, setHover] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; start: number; spacing: number; locked: boolean | null } | null>(null);
  const moved = useRef(false);
  const prevD = useRef<number[]>([]);
  const wheel = useRef({ acc: 0, at: 0 });
  const navigate = useNavigate();

  const go = useCallback((d: number) => setPos((p) => Math.round(p) + d), []);
  const user = (fn: () => void) => { setTouched(true); fn(); };

  // Slow auto-advance until the visitor interacts; pauses while hovered.
  useEffect(() => {
    if (touched || hover || n < 2 || typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => go(1), 6000);
    return () => window.clearInterval(t);
  }, [touched, hover, n, go]);

  if (!n) return null;
  const active = mod(Math.round(pos), n);
  const c = categories[active]!;
  const count = products.filter((p) => p.category === c.id).length;

  const spacingPx = () => {
    const w = stageRef.current?.querySelector<HTMLElement>(".tt-cf-item")?.offsetWidth ?? 230;
    return w * (window.innerWidth >= 768 ? 0.78 : 0.64);
  };

  // Signed distance of item i from the centre on the ring, in (-n/2, n/2].
  const dist = (i: number) => {
    let d = mod(i - pos + n / 2, n) - n / 2;
    if (d === -n / 2) d = n / 2;
    return d;
  };

  const ds = categories.map((_, i) => dist(i));
  // An item that wraps from one edge to the other must jump, not glide across the stage.
  const jumps = ds.map((d, i) => prevD.current[i] !== undefined && Math.abs(d - prevD.current[i]!) > n / 2);
  prevD.current = ds;

  return (
    <div
      className="tt-cf"
      role="region"
      aria-roledescription="carousel"
      aria-label="Shop by category"
      tabIndex={0}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onKeyDown={(e) => { if (e.key === "ArrowRight") user(() => go(1)); if (e.key === "ArrowLeft") user(() => go(-1)); }}
      style={{ ["--tint" as string]: c.tint, ["--ink" as string]: c.ink }}
    >
      <div
        ref={stageRef}
        className={`tt-cf-stage ${dragging ? "is-dragging" : ""}`}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { x: e.clientX, y: e.clientY, start: Math.round(pos), spacing: spacingPx(), locked: null };
          moved.current = false;
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (d.locked === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
            d.locked = Math.abs(dx) > Math.abs(dy); // horizontal drags move the ring; vertical ones scroll the page
            if (d.locked) { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setDragging(true); setTouched(true); }
          }
          if (!d.locked) return;
          moved.current = true;
          setPos(d.start - dx / d.spacing);
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d || !d.locked) return;
          const dx = e.clientX - d.x;
          const steps = -dx / d.spacing;
          // A short flick still moves one product; a long drag lands on the nearest one.
          const target = Math.abs(steps) < 0.5 && Math.abs(dx) > 30 ? d.start + Math.sign(steps) : Math.round(d.start + steps);
          setDragging(false);
          setPos(target);
        }}
        onPointerCancel={() => { drag.current = null; setDragging(false); setPos((p) => Math.round(p)); }}
        onClickCapture={(e) => { if (moved.current) { moved.current = false; e.stopPropagation(); e.preventDefault(); } }}
        onWheel={(e) => {
          if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
          const w = wheel.current;
          w.acc += e.deltaX;
          const now = Date.now();
          if (Math.abs(w.acc) > 60 && now - w.at > 700) { user(() => go(w.acc > 0 ? 1 : -1)); w.acc = 0; w.at = now; }
        }}
      >
        <span className="tt-cf-glow" aria-hidden="true" />
        {categories.map((cat, i) => {
          const d = ds[i]!;
          const a = Math.abs(d);
          const front = Math.round(a * 100) === 0;
          return (
            <button
              key={cat.id}
              type="button"
              className={`tt-cf-item ${jumps[i] ? "no-anim" : ""}`}
              style={{ ["--d" as string]: d, ["--a" as string]: Math.min(a, 2.5), zIndex: 100 - Math.round(a * 10), pointerEvents: a > 1.6 ? "none" : undefined }}
              aria-label={front ? `Shop ${cat.name}` : `Show ${cat.name}`}
              aria-hidden={a > 1.6}
              tabIndex={front ? 0 : -1}
              onClick={() => (front ? void navigate({ to: "/shop", search: { category: cat.id } }) : user(() => setPos(Math.round(pos) + Math.round(d))))}
            >
              <span className="tt-cf-float" style={{ animationDelay: `${-i * 2.3}s` }}>
                <CategoryArt cat={cat} />
              </span>
            </button>
          );
        })}
        <div className="tt-cf-arrows">
          <button type="button" className="tt-cf-arrow left-0" onClick={() => user(() => go(-1))} aria-label="Previous category"><span className="rotate-180"><IconArrow size={18} /></span></button>
          <button type="button" className="tt-cf-arrow right-0" onClick={() => user(() => go(1))} aria-label="Next category"><IconArrow size={18} /></button>
        </div>
      </div>

      <div key={c.id} className="tt-cf-info" aria-live="polite">
        <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: c.tint, color: c.ink }}>{count} product{count === 1 ? "" : "s"}</span>
        <h3 className="tt-display mt-3 text-3xl font-extrabold sm:text-[2.4rem]">{c.name}</h3>
        {c.blurb ? <p className="mt-1.5 text-tt-soft">{c.blurb}</p> : null}
        <Link to="/shop" search={{ category: c.id }} className="mt-5 inline-flex h-12 items-center gap-3 rounded-full bg-tt-leaf pl-6 pr-1.5 text-[15px] font-semibold text-white shadow-[0_12px_24px_-14px_rgba(27,128,83,.9)] transition hover:bg-tt-leafdeep">
          Shop {c.name}
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-tt-leafdeep"><span className="tt-arrow"><IconArrow size={16} /></span></span>
        </Link>
      </div>

      <div className="mt-6 flex justify-center gap-2" role="tablist" aria-label="Categories">
        {categories.map((cat, i) => (
          <button key={cat.id} type="button" role="tab" aria-selected={i === active} aria-label={cat.name} onClick={() => user(() => setPos(Math.round(pos) + Math.round(dist(i))))} className={`tt-cf-dot ${i === active ? "is-on" : ""}`} />
        ))}
      </div>
    </div>
  );
}
