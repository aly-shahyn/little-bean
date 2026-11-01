import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { AGES, mvr, normalizePhone } from "../../lib/catalog";
import { useAccount } from "../../lib/account";
import { useShop } from "../../lib/use-shop";
import { useCart } from "../../lib/cart";
import { IconArrow, IconBag, IconClose, IconInstagram, IconMenu, IconMinus, IconPlus, IconSearch, IconUser } from "./icons";
import { Logo } from "./logo";
import { SlideToGo } from "./slide-to-go";
import { useScrollLock } from "../../lib/scroll-lock";
import { SearchOverlay } from "./search";

const NAV_TINTS: [string, string][] = [
  ["#D8F3E3", "#157A52"],
  ["#FFD6C7", "#8A3B22"],
  ["#FFE9A8", "#7A5A0E"],
  ["#E7E0FF", "#4D3A86"],
  ["#FFDDE6", "#8C2F45"],
  ["#CDEBFF", "#1F5870"],
];

const ACTION = "tt-navlink inline-flex h-10 items-center gap-1 rounded-full px-2 text-[14.5px] font-medium text-tt-ink/80 sm:gap-1.5 sm:px-2.5 md:px-3";

export function Header() {
  const { settings, categories } = useShop();
  const { customer } = useAccount();
  const { count, setOpen, bumpKey } = useCart();
  const NAV: { label: string; category?: string; to: string }[] = [
    { to: "/shop", label: "Shop all" },
    ...categories.slice(0, 4).map((c) => ({ to: "/shop", label: c.name.split(" ")[0].replace(/[^A-Za-z]/g, "") || c.name, category: c.id })),
    { to: "/about", label: "How to order" },
  ];
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Close the menu on every navigation, including /shop -> /shop?category=... (same page, new filter).
  const href = useRouterState({ select: (s) => s.location.href });
  useEffect(() => setMenu(false), [href]);
  useScrollLock(menu);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <>
      {settings.announcement ? (
        <div className="bg-tt-bean px-4 py-2 text-center text-[12.5px] font-semibold text-tt-forest">{settings.announcement}</div>
      ) : null}
      <header className={`sticky top-0 z-40 border-b transition-colors ${scrolled ? "border-tt-line bg-tt-milk/90 backdrop-blur-md" : "border-transparent bg-tt-milk"}`}>
        <div className="tt-wrap flex h-[68px] items-center gap-2 sm:gap-4">
          <button type="button" className="-ml-2 grid h-10 w-10 place-items-center rounded-full lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu">
            <IconMenu size={22} />
          </button>
          <Link to="/" aria-label="Little Bean home" className="min-w-0 shrink">
            <Logo />
          </Link>
          <nav className="mx-auto hidden items-center gap-1 lg:flex" aria-label="Main">
            {NAV.map((n, i) => (
              <Link
                key={n.label}
                to={n.to}
                search={n.category ? { category: n.category } : undefined}
                style={{ ["--nb" as string]: NAV_TINTS[i % NAV_TINTS.length][0], ["--ni" as string]: NAV_TINTS[i % NAV_TINTS.length][1] }}
                className="tt-navlink rounded-full px-3.5 py-2 text-[14.5px] font-medium text-tt-ink/80"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-0 sm:gap-0.5 lg:ml-0">
            <button type="button" onClick={() => setSearch(true)} aria-label="Search products" style={{ ["--nb" as string]: "#CDEBFF", ["--ni" as string]: "#1F5870" }} className={ACTION}>
              <IconSearch size={19} /><span className="hidden md:inline">Search</span>
            </button>
            <Link to="/account" aria-label={customer ? "My account" : "Log in"} style={{ ["--nb" as string]: "#E7E0FF", ["--ni" as string]: "#4D3A86" }} className={ACTION}>
              {customer ? (
                customer.avatar ? <img src={customer.avatar} alt="" className="h-6 w-6 rounded-full object-cover" /> : <span className="grid h-6 w-6 place-items-center rounded-full bg-tt-sage text-[11px] font-bold text-tt-mintdeep">{customer.name.trim().charAt(0).toUpperCase()}</span>
              ) : (
                <IconUser size={19} />
              )}
              <span className="hidden md:inline">{customer ? customer.name.trim().split(" ")[0] : "Log in"}</span>
            </Link>
            <button type="button" onClick={() => setOpen(true)} data-cart-target aria-label={`Open basket, ${count} items`} style={{ ["--nb" as string]: "#FFD6C7", ["--ni" as string]: "#8A3B22" }} className={ACTION}>
              <IconBag size={19} /><span className="hidden md:inline">Basket</span>
              {count > 0 ? <span key={bumpKey} className="tt-bump grid h-[18px] min-w-[18px] place-items-center rounded-full bg-tt-coral px-1 text-[11px] font-bold text-white">{count}</span> : null}
            </button>
          </div>
        </div>
      </header>

      {menu ? (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-tt-ink/30 backdrop-blur-[2px]" onClick={() => setMenu(false)} />
          <nav className="tt-rise relative mx-auto mt-3 max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-2xl overflow-y-auto overscroll-contain rounded-[28px] bg-white shadow-[0_30px_70px_-30px_rgba(42,36,64,0.5)]">
            <div className="flex items-center justify-between border-b border-tt-line px-5 py-3">
              <Logo />
              <button type="button" onClick={() => setMenu(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-tt-milk" aria-label="Close menu"><IconClose size={20} /></button>
            </div>
            <div className="p-4">
              <Link to="/shop" onClick={() => setMenu(false)} className="flex items-center justify-between rounded-2xl bg-tt-sage px-4 py-3.5 text-[17px] font-bold text-tt-forest">
                Shop all <span className="tt-arrow"><IconArrow size={18} /></span>
              </Link>
              <p className="mt-5 px-1 text-xs font-bold uppercase tracking-[0.14em] text-tt-soft">Categories</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <Link key={c.id} to="/shop" search={{ category: c.id }} onClick={() => setMenu(false)} className="rounded-full px-3.5 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5" style={{ background: c.tint, color: c.ink }}>{c.name}</Link>
                ))}
              </div>
              <p className="mt-5 px-1 text-xs font-bold uppercase tracking-[0.14em] text-tt-soft">By age</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {AGES.map((a) => (
                  <Link key={a.id} to="/shop" search={{ age: a.id }} onClick={() => setMenu(false)} className="rounded-full bg-tt-milk px-3.5 py-2 text-sm font-semibold ring-1 ring-tt-line hover:bg-white">{a.label}</Link>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Link to="/about" onClick={() => setMenu(false)} className="rounded-2xl bg-tt-milk px-4 py-3 text-[15px] font-semibold ring-1 ring-tt-line">How to order</Link>
                <Link to="/account" onClick={() => setMenu(false)} className="rounded-2xl bg-tt-milk px-4 py-3 text-[15px] font-semibold ring-1 ring-tt-line">{customer ? "My account" : "Log in / Sign up"}</Link>
              </div>
              {settings.instagram ? (
                <a href={`https://www.instagram.com/${settings.instagram}/`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 px-1 text-sm text-tt-soft">
                  <IconInstagram size={18} /> @{settings.instagram}
                </a>
              ) : null}
            </div>
          </nav>
        </div>
      ) : null}
      <CartDrawer />
      <SearchOverlay open={search} onClose={() => setSearch(false)} />
    </>
  );
}

function CartDrawer() {
  const { lines, open, setOpen, setQty, subtotal, count, add, lastAdded, bumpKey } = useCart();
  useScrollLock(open);
  const listRef = useRef<HTMLDivElement>(null);
  // When something is added while the basket is open, bring that line into view and flash it.
  useEffect(() => {
    if (!open || !lastAdded) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-line="${CSS.escape(lastAdded)}"]`);
    if (!el) return;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    el.animate?.([{ backgroundColor: "rgba(216,243,227,0.9)" }, { backgroundColor: "rgba(216,243,227,0)" }], { duration: 1200, easing: "ease-out" });
  }, [bumpKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const navigate = useNavigate();
  const { brandOf, products, pairs } = useShop();
  const inCart = new Set(lines.flatMap((l) => (l.bundle ? l.bundle.map((b) => b.id) : [l.id])));
  const baseId = lastAdded && !lastAdded.startsWith("bundle:") ? lastAdded : [...lines].reverse().find((l) => !l.bundle)?.id ?? "";
  const base = products.find((p) => p.id === baseId);
  const pool = (pairs?.[baseId] ?? []).map((id) => products.find((p) => p.id === id)).filter((p): p is (typeof products)[number] => !!p);
  if (base) {
    for (const p of products) if (p.category !== base.category && (p.age === base.age || p.age === "Family") && p.id !== base.id) pool.push(p);
    for (const p of products) if (p.category === base.category && p.brand !== base.brand && p.id !== base.id) pool.push(p);
  }
  const suggestions = [...new Map(pool.filter((p) => p.in_stock && !p.hidden && !inCart.has(p.id)).map((p) => [p.id, p])).values()].slice(0, 3);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);
  return (
    <>
      <div className={`tt-scrim fixed inset-0 z-50 bg-tt-ink/30 ${open ? "is-open" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`tt-drawer fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col bg-tt-milk ${open ? "is-open" : ""}`} aria-hidden={!open} aria-label="Your cart">
        <div className="flex items-center justify-between border-b border-tt-line px-6 py-5">
          <h2 className="tt-display text-2xl font-bold">Your basket <span className="text-tt-soft">({count})</span></h2>
          <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-white" aria-label="Close cart">
            <IconClose />
          </button>
        </div>
        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-tt-peach text-tt-leafdeep"><IconBag size={34} /></div>
            <p className="tt-display text-xl font-bold">Your basket is empty</p>
            <p className="text-sm text-tt-soft">Find something yummy for your little one.</p>
            <Link to="/shop" onClick={() => setOpen(false)} className="mt-2 inline-flex items-center gap-2 font-semibold text-tt-leaf underline decoration-2 underline-offset-4">
              Browse the shop <span className="tt-arrow"><IconArrow size={16} /></span>
            </Link>
          </div>
        ) : (
          <>
            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <ul className="divide-y divide-tt-line px-6">
              {lines.map((l) => (
                <li key={l.id} data-line={l.id} className="-mx-3 flex gap-4 rounded-2xl px-3 py-4">
                  <img src={l.image} alt="" className="h-20 w-16 shrink-0 rounded-2xl object-cover" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-tt-soft">{l.brand === "bundle" ? "Bundle deal" : brandOf(l.brand).name}</span>
                    <span className="text-[14.5px] font-semibold leading-snug">{l.name}</span>
                    {l.bundle ? <span className="text-[11.5px] text-tt-soft">{l.bundle.map((b) => products.find((p) => p.id === b.id)?.name ?? b.id).join(" + ")}</span> : null}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-full bg-white ring-1 ring-tt-line">
                        <button type="button" className="grid h-8 w-8 place-items-center" onClick={() => setQty(l.id, l.qty - 1)} aria-label="Decrease"><IconMinus size={15} /></button>
                        <span className="w-6 text-center text-sm font-semibold">{l.qty}</span>
                        <button type="button" className="grid h-8 w-8 place-items-center" onClick={() => setQty(l.id, l.qty + 1)} aria-label="Increase"><IconPlus size={15} /></button>
                      </div>
                      <span className="text-sm font-bold">{mvr(l.price * l.qty)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {suggestions.length ? (
              <div className="mt-2 border-t border-tt-line bg-[#F3F9F2] px-6 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8A3B22]">Frequently bought together</p>
                <ul className="mt-3 grid grid-cols-3 gap-2">
                  {suggestions.map((p) => (
                    <li key={p.id} className="flex flex-col rounded-2xl bg-white p-2 ring-1 ring-tt-line">
                      <img src={p.image} alt="" className="aspect-square w-full rounded-xl bg-tt-milk object-cover" />
                      <span className="mt-1.5 line-clamp-2 text-[11.5px] font-semibold leading-tight">{p.name}</span>
                      <span className="mt-auto flex items-center justify-between pt-1.5">
                        <span className="text-[12px] font-bold text-tt-leafdeep">{mvr(p.price)}</span>
                        <button type="button" onClick={() => add(p, 1, false)} className="grid h-7 w-7 place-items-center rounded-full bg-tt-leaf text-white transition-transform hover:scale-110" aria-label={`Add ${p.name}`}><IconPlus size={14} /></button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            </div>
            <div className="border-t border-tt-line bg-white px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
              <div className="flex items-center justify-between text-[15px]">
                <span className="text-tt-soft">Subtotal</span>
                <span className="tt-display text-xl font-bold">{mvr(subtotal)}</span>
              </div>
              <div className="mt-4">
                <SlideToGo label="Slide to checkout" onDone={() => { setOpen(false); void navigate({ to: "/checkout" }); }} />
              </div>
              <p className="mt-3 text-center text-xs text-tt-soft">Pay by BML bank transfer at checkout.</p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

export function Footer() {
  const { settings, categories, brands, t } = useShop();
  const wa = normalizePhone(settings.whatsapp || "");
  return (
    <footer className="mt-24 bg-tt-forest text-white">
      <div className="tt-wrap grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="inline-flex rounded-2xl bg-tt-milk px-3 py-2"><Logo /></div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/75">
            {t("footer_text")}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white/60">Shop</h3>
          <ul className="mt-3 space-y-2 text-[15px]">
            {categories.map((c) => (
              <li key={c.id}><Link to="/shop" search={{ category: c.id }} className="hover:underline">{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white/60">Brands</h3>
          <ul className="mt-3 space-y-2 text-[15px]">
            {brands.map((b) => (
              <li key={b.id}><Link to="/shop" search={{ brand: b.id }} className="hover:underline">{b.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white/60">Help</h3>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li><Link to="/about" className="hover:underline">How to order</Link></li>
            <li><Link to="/about" hash="faq" className="hover:underline">Questions</Link></li>
            {wa ? <li><a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="hover:underline">WhatsApp us</a></li> : null}
            {settings.instagram ? (
              <li><a href={`https://www.instagram.com/${settings.instagram}/`} target="_blank" rel="noreferrer" className="hover:underline">Instagram</a></li>
            ) : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="tt-wrap flex flex-col gap-2 py-5 text-xs text-white/60 sm:flex-row sm:justify-between">
          <span>{t("footer_left")}</span>
          <span>{t("footer_right")}</span>
        </div>
      </div>
    </footer>
  );
}
