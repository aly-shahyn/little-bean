import type { CSSProperties, ReactNode } from "react";

type Item = { src: string; x: number; y: number; size: number; dur: number; dx: number; dy: number; r: number; zip?: boolean; mobile?: { x: string; y: string; size: number } };
// Fruit keeps moving on its own. "zip" items travel faster with a motion-blur trail.
const ITEMS: Item[] = [
  { src: "strawberry", x: 12, y: 20, size: 92, dur: 5.5, dx: 18, dy: -22, r: -12, mobile: { x: "9%", y: "70px", size: 58 } },
  { src: "banana", x: 86, y: 16, size: 112, dur: 3.2, dx: -70, dy: 26, r: 14, zip: true, mobile: { x: "91%", y: "64px", size: 66 } },
  { src: "avocado", x: 22, y: 60, size: 100, dur: 6.5, dx: 14, dy: 20, r: 8 },
  { src: "carrot", x: 8, y: 84, size: 96, dur: 2.8, dx: 80, dy: -36, r: -18, zip: true },
  { src: "broccoli", x: 79, y: 54, size: 92, dur: 6, dx: -16, dy: -18, r: -10 },
  { src: "apple", x: 91, y: 82, size: 90, dur: 3.6, dx: -60, dy: -30, r: 12, zip: true },
];

function Fruit({ it, i }: { it: Item; i: number }) {
  const style = { left: `${it.x}%`, top: `${it.y}%`, width: it.size, ["--dx" as string]: `${it.dx}px`, ["--dy" as string]: `${it.dy}px`, ["--r" as string]: `${it.r}deg`, ["--dur" as string]: `${it.dur}s`, animationDelay: `${-i * 0.9}s`, ...(it.mobile ? { ["--mx" as string]: it.mobile.x, ["--my" as string]: it.mobile.y, ["--ms" as string]: `${it.mobile.size}px` } : {}) } as CSSProperties;
  const img = <img src={`/assets/memoji/${it.src}.webp`} alt="" width={it.size} height={it.size} draggable={false} />;
  return (
    <span className={`tt-fruit ${it.zip ? "tt-fruit-zip" : ""} ${it.mobile ? "" : "tt-desktop-only"}`} style={style} aria-hidden="true">
      {it.zip ? (
        <>
          <span className="tt-ghost tt-ghost-2" style={{ animationDelay: `calc(${-i * 0.9}s - 0.16s)` }}>{img}</span>
          <span className="tt-ghost tt-ghost-1" style={{ animationDelay: `calc(${-i * 0.9}s - 0.08s)` }}>{img}</span>
        </>
      ) : null}
      <span className="tt-fruit-main" style={{ animationDelay: `${-i * 0.9}s` }}>{img}</span>
    </span>
  );
}

export function LoginScene({ children }: { children: ReactNode }) {
  return (
    <div className="tt-login-scene">
      <div className="tt-login-orbit" aria-hidden="true" />
      {ITEMS.map((it, i) => <Fruit key={it.src} it={it} i={i} />)}
      <div className="tt-wrap relative z-10 py-10 sm:py-12">
        <div className="mx-auto max-w-md text-center">
          <div className="tt-parents">
            <img src="/assets/memoji/mom.webp" alt="Smiling 3D mama face" width="124" height="124" className="tt-parent tt-parent-mom" />
            <img src="/assets/memoji/dad.webp" alt="Smiling 3D papa face" width="124" height="124" className="tt-parent tt-parent-dad" />
          </div>
          <h1 className="tt-display tt-rise mt-3 text-4xl font-extrabold sm:text-[2.7rem]">Welcome, mama &amp; papa</h1>
          <p className="mt-3 text-tt-soft">Your little one's favourites, all in one happy place.</p>
        </div>
        <div className="tt-auth-card mt-6">{children}</div>
      </div>
    </div>
  );
}
