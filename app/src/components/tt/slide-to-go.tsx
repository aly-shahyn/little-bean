import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { IconArrow } from "./icons";

const KNOB = 48; // px
const PAD = 4; // px around the knob

/**
 * "Slide to checkout": drag the knob to the end to continue. Releasing early springs it back.
 * Keyboard users focus the knob and press Enter or Space.
 */
export function SlideToGo({ label, onDone }: { label: string; onDone: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const from = useRef(0);
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);

  const max = () => Math.max(1, (track.current?.clientWidth ?? 0) - KNOB - PAD * 2);
  const p = Math.min(1, x / max());

  function finish() {
    if (done) return;
    setDone(true);
    setX(max());
    window.setTimeout(onDone, 260);
    window.setTimeout(() => { setDone(false); setX(0); }, 1200);
  }
  function down(e: PointerEvent<HTMLButtonElement>) {
    if (done) return;
    from.current = e.clientX - x;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    if (!dragging) return;
    setX(Math.min(max(), Math.max(0, e.clientX - from.current)));
  }
  function up() {
    if (!dragging) return;
    setDragging(false);
    if (x >= max() * 0.82) finish();
    else setX(0);
  }
  function key(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); finish(); }
  }

  const spring = "cubic-bezier(.2,.9,.25,1.15)";
  return (
    <div ref={track} className="tt-slide relative h-14 select-none overflow-hidden rounded-2xl bg-tt-ink text-white" style={{ padding: PAD }}>
      <span className="absolute inset-y-0 left-0 rounded-2xl bg-tt-coral/90" style={{ width: x + KNOB + PAD * 2, transition: dragging ? "none" : `width .38s ${spring}`, opacity: 0.25 + p * 0.75 }} aria-hidden="true" />
      <span className="pointer-events-none absolute inset-0 grid place-items-center pl-10 font-semibold" style={{ opacity: done ? 0 : Math.max(0, 1 - p * 1.6) }} aria-hidden="true">
        <span className="tt-slide-hint">{label}</span>
      </span>
      {done ? <span className="absolute inset-0 grid place-items-center font-semibold" aria-hidden="true">Opening checkout...</span> : null}
      <button
        type="button"
        aria-label={`${label}. Press Enter to continue.`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
        className="relative z-10 grid cursor-grab place-items-center rounded-xl bg-tt-coral text-tt-ink shadow-[0_8px_18px_-8px_rgba(0,0,0,.6)] active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        style={{ width: KNOB, height: KNOB, transform: `translateX(${x}px)`, transition: dragging ? "none" : `transform .38s ${spring}`, touchAction: "none" }}
      >
        <span className={x === 0 && !done ? "tt-slide-nudge" : ""}><IconArrow size={20} /></span>
      </button>
    </div>
  );
}
