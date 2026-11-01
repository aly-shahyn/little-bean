import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import type { Category } from "../../lib/catalog";

type Shape = "cloud" | "star" | "moon" | "heart" | "flower";
const SHAPES: Shape[] = ["cloud", "star", "moon", "heart", "flower"];

/** Hang points (percent of width) and string lengths (percent of height) for up to 5 charms. */
const SLOTS = [
  { x: 14, len: 22, dur: 4.6, delay: -0.4 },
  { x: 32, len: 42, dur: 5.4, delay: -2.1 },
  { x: 50, len: 26, dur: 4.2, delay: -1.2 },
  { x: 68, len: 46, dur: 5.8, delay: -3.3 },
  { x: 86, len: 24, dur: 4.9, delay: -0.9 },
];

function ShapePath({ shape, fill, stroke }: { shape: Shape; fill: string; stroke: string }) {
  const common = { fill, stroke, strokeWidth: 4, strokeLinejoin: "round" as const };
  switch (shape) {
    case "cloud":
      return <path {...common} d="M30 86c-13 0-22-9-22-20 0-10 7-18 17-20 2-15 14-25 29-25 12 0 22 7 26 17 3-1 6-2 9-2 14 0 25 11 25 25s-11 25-25 25H30Z" />;
    case "star":
      return <path {...common} strokeWidth={10} stroke={fill} d="M60 12l13 29 31 3-23 21 7 31-28-16-28 16 7-31-23-21 31-3Z" />;
    case "moon":
      return <path {...common} d="M78 14c-26 2-46 23-46 49s20 46 46 47c-8 5-18 8-28 8-30 0-52-24-52-54S20 10 50 10c10 0 20 2 28 4Z" transform="translate(12 -4)" />;
    case "heart":
      return <path {...common} d="M60 104S12 76 12 44c0-17 13-28 27-28 10 0 17 5 21 12 4-7 11-12 21-12 14 0 27 11 27 28 0 32-48 60-48 60Z" />;
    default:
      return (
        <g {...common}>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <circle key={a} cx={60 + Math.cos((a * Math.PI) / 180) * 28} cy={60 + Math.sin((a * Math.PI) / 180) * 28} r={22} />
          ))}
          <circle cx={60} cy={60} r={30} />
        </g>
      );
  }
}

function Face({ look, happy, cy = 60 }: { look: { x: number; y: number }; happy: boolean; cy?: number }) {
  const dx = look.x * 2.6;
  const dy = look.y * 2.2;
  return (
    <g>
      <circle cx={47} cy={cy - 4} r={6.5} fill="#fff" />
      <circle cx={73} cy={cy - 4} r={6.5} fill="#fff" />
      <circle cx={47 + dx} cy={cy - 4 + dy} r={3.6} fill="#2A2440" />
      <circle cx={73 + dx} cy={cy - 4 + dy} r={3.6} fill="#2A2440" />
      <circle cx={39} cy={cy + 8} r={5} fill="#FF7A59" opacity={0.35} />
      <circle cx={81} cy={cy + 8} r={5} fill="#FF7A59" opacity={0.35} />
      {happy ? (
        <path d={`M49 ${cy + 7} q11 13 22 0`} fill="#2A2440" />
      ) : (
        <path d={`M51 ${cy + 8} q9 7 18 0`} fill="none" stroke="#2A2440" strokeWidth={3} strokeLinecap="round" />
      )}
    </g>
  );
}

/**
 * A playful hanging crib mobile. Each charm is a shop category: it swings,
 * its eyes follow the pointer, it giggles on hover and opens the category on tap.
 */
export function BabyMobile({ categories, hint }: { categories: Category[]; hint: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [hot, setHot] = useState<number | null>(null);
  const [boing, setBoing] = useState(0);
  const charms = categories.slice(0, 5);

  useEffect(() => {
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const el = box.current;
      if (!el) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 2 - 1;
        const y = ((e.clientY - r.top) / r.height) * 2 - 1;
        setLook({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={box} className="relative mx-auto aspect-[1/1.02] w-full max-w-[600px] select-none" style={{ containerType: "inline-size" }}>
      {/* soft sky glow */}
      <div className="pointer-events-none absolute inset-[6%] rounded-full bg-[radial-gradient(circle_at_50%_45%,#CDEBFF_0%,#E7E0FF_38%,rgba(255,251,243,0)_70%)]" aria-hidden="true" />
      {/* sky decorations */}
      <svg className="tt-spin-slow absolute right-[4%] top-[2%] h-[17%] w-[17%]" viewBox="0 0 100 100" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x={48} y={2} width={4} height={14} rx={2} fill="#FFD66B" transform={`rotate(${i * 30} 50 50)`} />
        ))}
        <circle cx={50} cy={50} r={26} fill="#FFE08A" />
        <circle cx={42} cy={47} r={2.6} fill="#2A2440" />
        <circle cx={58} cy={47} r={2.6} fill="#2A2440" />
        <path d="M42 56 q8 8 16 0" fill="none" stroke="#2A2440" strokeWidth={2.6} strokeLinecap="round" />
      </svg>
      {[
        { l: "-4%", t: "58%", w: "30%", d: 38 },
        { l: "62%", t: "76%", w: "34%", d: 46 },
        { l: "20%", t: "86%", w: "22%", d: 30 },
      ].map((c, i) => (
        <svg key={i} className="tt-drift absolute" style={{ left: c.l, top: c.t, width: c.w, animationDuration: `${c.d}s`, animationDelay: `-${i * 7}s` }} viewBox="0 0 120 60" aria-hidden="true">
          <path d="M22 52c-10 0-18-7-18-16s7-15 16-16c2-11 12-18 23-18 9 0 17 5 21 13 2-1 5-1 7-1 11 0 20 8 20 19 0 11-9 19-20 19H22Z" fill="#fff" opacity={0.95} />
        </svg>
      ))}
      {[[8, 20], [26, 8], [92, 44], [4, 44], [78, 60], [40, 70]].map(([x, y], i) => (
        <span key={i} className="tt-twinkle absolute h-2 w-2 rounded-full bg-[#FFD66B]" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.6}s` }} aria-hidden="true" />
      ))}

      {/* the mobile */}
      <div
        className="absolute inset-x-[2%] top-[4%] bottom-[10%] transition-transform duration-700 ease-out"
        style={{ transform: `rotate(${look.x * 3}deg)`, transformOrigin: "50% 0%" }}
      >
        <div key={boing} className={boing ? "tt-boing absolute inset-0" : "absolute inset-0"} style={{ transformOrigin: "50% 0%" }}>
          {/* hook + arm */}
          <svg className="absolute left-0 top-0 h-[16%] w-full overflow-visible" viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true">
            <path d="M50 0 V6" stroke="#8C6B4F" strokeWidth={0.6} />
            <path d="M8 13 Q50 1 92 13" fill="none" stroke="#1B8053" strokeWidth={7} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="absolute left-1/2 top-[1%] h-4 w-4 -translate-x-1/2 rounded-full border-[3px] border-[#8C6B4F] bg-transparent" aria-hidden="true" />

          {charms.map((c, i) => {
            const slot = SLOTS[i];
            const shape = SHAPES[i % SHAPES.length];
            const tt = (slot.x - 8) / 84;
            const armY = 13 - 24 * tt * (1 - tt);
            const isHot = hot === i;
            return (
              <div
                key={c.id}
                className={`tt-swing absolute ${isHot ? "tt-swing-hot" : ""}`}
                style={{ left: `${slot.x}%`, top: `${armY - 0.6}%`, width: "21%", marginLeft: "-10.5%", transformOrigin: "50% 0%", animationDuration: `${isHot ? 0.9 : slot.dur}s`, animationDelay: `${slot.delay}s` }}
              >
                <span className="mx-auto block w-[2px] bg-[#8C6B4F]/60" style={{ height: `${slot.len * 1.05}cqw` }} aria-hidden="true" />
                <Link
                  to="/shop"
                  search={{ category: c.id }}
                  onPointerEnter={() => setHot(i)}
                  onPointerLeave={() => setHot(null)}
                  onClick={() => setBoing((b) => b + 1)}
                  className="group -mt-1 block text-center outline-none"
                  aria-label={`Shop ${c.name}`}
                >
                  <svg viewBox="0 0 120 120" className={`mx-auto w-full drop-shadow-[0_10px_14px_rgba(42,36,64,0.18)] transition-transform duration-300 ${isHot ? "scale-110" : ""}`}>
                    <ShapePath shape={shape} fill={c.tint} stroke={c.ink + "33"} />
                    <Face look={look} happy={isHot} cy={shape === "cloud" ? 62 : shape === "heart" ? 56 : 62} />
                  </svg>
                  <span
                    className="mt-1 inline-block whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-bold shadow-sm transition-colors sm:text-[13.5px]"
                    style={{ background: isHot ? c.ink : "#fff", color: isHot ? "#fff" : c.ink }}
                  >
                    {c.name.split(" & ")[0]}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      <p className="absolute bottom-[1%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/80 px-4 py-1.5 text-[13px] font-semibold text-tt-soft backdrop-blur">
        {hint}
      </p>
    </div>
  );
}
