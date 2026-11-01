import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { BUNDLE_PREFIX, bundleItems, type Bundle, type Product } from "./catalog";
import { flyToCart } from "./fly-to-cart";

export type CartLine = { id: string; name: string; price: number; image: string; brand: string; qty: number; bundle?: { id: string; qty: number }[] };

type CartCtx = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  open: boolean;
  bumpKey: number;
  setOpen: (v: boolean) => void;
  add: (p: Product, qty?: number, openDrawer?: boolean) => void;
  addBundle: (b: Bundle, image: string) => void;
  lastAdded: string;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "tt-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [bumpKey, setBumpKey] = useState(0);
  const [lastAdded, setLastAdded] = useState("");
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLines(parsed.filter((l) => l && typeof l.id === "string"));
      }
    } catch {
      /* storage unavailable */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* storage unavailable */
    }
  }, [lines]);

  const [announce, setAnnounce] = useState("");
  // Adding never opens the basket: the product flies to the basket icon instead.
  const add = useCallback((p: Product, qty = 1, openDrawer = false) => {
    setLines((cur) => {
      const found = cur.find((l) => l.id === p.id);
      if (found) return cur.map((l) => (l.id === p.id ? { ...l, qty: Math.min(50, l.qty + qty), price: p.price } : l));
      return [...cur, { id: p.id, name: p.name, price: p.price, image: p.image, brand: p.brand, qty }];
    });
    setBumpKey((k) => k + 1);
    setLastAdded(p.id);
    setAnnounce(`Added ${p.name} to your basket.`);
    if (openDrawer) setOpen(true);
    else flyToCart(p.image);
  }, []);

  const addBundle = useCallback((b: Bundle, image: string) => {
    const id = BUNDLE_PREFIX + b.id;
    setLines((cur) => {
      const found = cur.find((l) => l.id === id);
      if (found) return cur.map((l) => (l.id === id ? { ...l, qty: Math.min(20, l.qty + 1), price: b.price } : l));
      return [...cur, { id, name: b.name, price: b.price, image, brand: "bundle", qty: 1, bundle: bundleItems(b) }];
    });
    setBumpKey((k) => k + 1);
    setLastAdded(id);
    setAnnounce(`Added the ${b.name} bundle to your basket.`);
    flyToCart(image);
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((cur) => (qty <= 0 ? cur.filter((l) => l.id !== id) : cur.map((l) => (l.id === id ? { ...l, qty: Math.min(50, qty) } : l))));
  }, []);
  const remove = useCallback((id: string) => setLines((cur) => cur.filter((l) => l.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartCtx>(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
    return { lines, count, subtotal, open, bumpKey, setOpen, add, addBundle, lastAdded, setQty, remove, clear };
  }, [lines, open, bumpKey, add, addBundle, lastAdded, setQty, remove, clear]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="sr-only" aria-live="polite" role="status">{announce}</div>
    </Ctx.Provider>
  );
}

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}

/** Transform-only reveal: content is always visible; it just settles into place. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}
