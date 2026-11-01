/**
 * "Fly to basket": a small copy of the product photo arcs from where the shopper tapped
 * to the basket icon in the header, then the icon gives a little bounce. Client only.
 */
let lastEl: Element | null = null;
let lastAt = 0;
if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", (e) => { lastEl = e.target instanceof Element ? e.target : null; lastAt = Date.now(); }, { capture: true, passive: true });
}

function visibleCartIcon(): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>("[data-cart-target]"));
  return all.find((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }) ?? null;
}

export function bounceCart() {
  const cart = visibleCartIcon();
  cart?.animate?.([{ transform: "scale(1)" }, { transform: "scale(1.28) rotate(-8deg)" }, { transform: "scale(0.94)" }, { transform: "scale(1)" }], { duration: 420, easing: "ease-out" });
}

/** Returns false when there was nothing to fly from (e.g. the tap was inside the basket drawer). */
export function flyToCart(image: string): boolean {
  if (typeof window === "undefined") return false;
  const src = Date.now() - lastAt < 1500 ? lastEl : document.activeElement;
  if (!src || src.closest(".tt-drawer")) return false; // adding from inside the basket: no flight needed
  const cart = visibleCartIcon();
  if (!cart) return false;
  const card = src.closest("[data-fly-card], article, li, figure");
  const img = card?.querySelector("img");
  const ir = img?.getBoundingClientRect();
  const imgInView = !!ir && ir.width > 0 && ir.bottom > 40 && ir.top < window.innerHeight - 40;
  const fromEl = img && imgInView ? img : (src.closest("button") ?? src);
  const from = fromEl.getBoundingClientRect();
  const to = cart.getBoundingClientRect();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !image) { bounceCart(); return true; }

  const size = Math.max(44, Math.min(96, from.width, from.height));
  const x0 = from.left + from.width / 2 - size / 2;
  const y0 = from.top + from.height / 2 - size / 2;
  const dx = to.left + to.width / 2 - (x0 + size / 2);
  const dy = to.top + to.height / 2 - (y0 + size / 2);
  const ghost = document.createElement("img");
  ghost.src = image;
  ghost.alt = "";
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed", left: `${x0}px`, top: `${y0}px`, width: `${size}px`, height: `${size}px`, objectFit: "cover",
    borderRadius: "22px", zIndex: "9999", pointerEvents: "none", boxShadow: "0 14px 30px -12px rgba(42,36,64,.55)",
    border: "3px solid #fff", background: "#fff", willChange: "transform, opacity",
  } as Partial<CSSStyleDeclaration>);
  document.body.appendChild(ghost);
  const lift = Math.min(140, Math.abs(dy) * 0.35 + 50);
  const anim = ghost.animate(
    [
      { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - lift}px) scale(0.8) rotate(-8deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.18) rotate(6deg)`, opacity: 0.35 },
    ],
    { duration: 720, easing: "cubic-bezier(.45,0,.25,1)" },
  );
  const done = () => { ghost.remove(); bounceCart(); };
  anim.onfinish = done;
  anim.oncancel = () => ghost.remove();
  return true;
}
