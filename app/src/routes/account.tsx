import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { normalizePhone } from "../lib/catalog";
import { useAccount } from "../lib/account";
import { useCart } from "../lib/cart";
import { useShop } from "../lib/use-shop";
import { AuthForms } from "../components/tt/auth-forms";
import { ProductCard } from "../components/tt/product-card";
import { DetailsForm, PasswordForm, Sheet, ageGroup, ageMonths } from "../components/tt/account-bits";
import { BabyBanner, BabyForm, babyTheme } from "../components/tt/baby";
import { LoginScene } from "../components/tt/login-scene";
import { OrderJourney } from "../components/tt/order-journey";
import { BeanJarIcon, BeanPointsCard } from "../components/tt/points-card";
import { IconBag, IconCamera, IconPen, IconChat, IconHeart, IconLeaf, IconLock, IconTruck } from "../components/tt/icons";
import "../components/tt/refinement.css";

type AccountSearch = { next?: string };

export const Route = createFileRoute("/account")({
  validateSearch: (s: Record<string, unknown>): AccountSearch => ({ next: s.next === "checkout" ? "checkout" : undefined }),
  head: () => ({ meta: [{ title: "My account | Little Bean" }, { name: "robots", content: "noindex" }] }),
  component: AccountPage,
});


function AccountPage() {
  const { customer, orders, loading, refresh, logout, saved } = useAccount();
  const { count } = useCart();
  const { products, settings } = useShop();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<"" | "details" | "password" | "baby">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [babyG, setBabyG] = useState("");
  const [menu, setMenu] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (t: string) => {
    setNote(t);
    window.setTimeout(() => setNote(""), 2600);
  };

  if (loading) return <div className="tt-wrap py-12" aria-label="Loading account" role="status"><div className="tt-account-skeleton" /><div className="mt-5 grid grid-cols-2 gap-4"><div className="tt-account-skeleton small" /><div className="tt-account-skeleton small" /></div></div>;

  if (!customer) {
    return (
      <LoginScene>
        <AuthForms
          onDone={async () => {
            await refresh();
            if (search.next === "checkout" && count) void navigate({ to: "/checkout" });
          }}
        />
      </LoginScene>
    );
  }

  const st = customer.status;
  const first = customer.name.trim().split(" ")[0];
  const since = customer.created_at ? new Date(customer.created_at.replace(" ", "T") + "Z").toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "";
  const savedProducts = saved.map((id) => products.find((p) => p.id === id)).filter((p): p is (typeof products)[number] => !!p);
  const months = ageMonths(customer.baby_birth || "");
  const group = months === null ? "" : ageGroup(months);
  const picks = group ? products.filter((p) => p.age === group && p.in_stock && !saved.includes(p.id)).slice(0, 4) : [];
  const active = orders.filter((o) => o.status === "pending" || o.status === "confirmed");
  const past = orders.filter((o) => !(o.status === "pending" || o.status === "confirmed"));
  const wa = normalizePhone(settings.whatsapp || "");
  const iconLinks = (
    <>
      <a href="#orders" aria-label={`My orders (${orders.length})`} title="My orders" className="tt-acc-icon"><IconBag size={19} />{orders.length ? <span className="tt-acc-badge">{orders.length > 99 ? "99+" : orders.length}</span> : null}</a>
      <a href="#saved" aria-label={`Saved (${saved.length})`} title="Saved" className="tt-acc-icon"><IconHeart size={19} />{saved.length ? <span className="tt-acc-badge">{saved.length > 99 ? "99+" : saved.length}</span> : null}</a>
    </>
  );
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  async function uploadPhoto(file: File | null, remove = false) {
    const fd = new FormData();
    if (remove) fd.set("remove", "1");
    else if (file) fd.set("photo", file);
    else return;
    setBusy(true);
    const r = await fetch("/api/account/avatar", { method: "POST", body: fd });
    const d = (await r.json().catch(() => ({ ok: false }))) as { ok: boolean; error?: string };
    setBusy(false);
    if (d.ok) {
      await refresh();
      flash(remove ? "Photo removed" : "Lovely photo! Saved.");
    } else flash(d.error || "Could not upload photo");
  }

  const pastShown = showAll ? past : past.slice(0, 3);

  return (
    <div className="tt-account-page relative pb-16">
      <div className="tt-wrap max-w-4xl pt-6 sm:pt-10">
        {/* welcome */}
        <section className="tt-acc-hero tt-rise">
          <div className="relative flex items-start gap-4 sm:gap-6">
            <div className="tt-acc-avatar">
              <div>{customer.avatar ? <img src={customer.avatar} alt={customer.name} className="h-full w-full object-cover" /> : <span className="tt-display text-4xl font-extrabold text-[#4D3A86]">{first.charAt(0).toUpperCase()}</span>}</div>
              <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-tt-ink text-white ring-[3px] ring-white transition hover:scale-110 disabled:opacity-60" aria-label="Change profile photo">
                <IconCamera size={14} />
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { void uploadPhoto(e.target.files?.[0] ?? null); e.target.value = ""; }} />
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm font-semibold text-tt-leafdeep">{greeting},</p>
              <h1 className="tt-display flex flex-wrap items-center gap-x-2 text-[1.75rem] font-extrabold leading-tight sm:text-[2.6rem]">
                <span className="min-w-0 break-words">{first}</span>
                {st === "approved" ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" aria-label="Verified" role="img" className="shrink-0">
                    <path fill="#3B9BF0" d="M12 1.5l2.6 1.9 3.2-.2 1 3 2.7 1.8-.9 3.1.9 3.1-2.7 1.8-1 3-3.2-.2L12 22.5l-2.6-1.9-3.2.2-1-3-2.7-1.8.9-3.1-.9-3.1 2.7-1.8 1-3 3.2.2z" />
                    <path d="m8 12.2 2.6 2.6L16.2 9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </h1>
              <p className="mt-1 text-[15px] text-tt-soft">{customer.baby_name ? <>Shopping for <b className="text-tt-ink">{customer.baby_name}</b>{months !== null ? `, ${months === 0 ? "newborn" : `${months} month${months === 1 ? "" : "s"}`}` : ""}</> : "Happy little tummies start here."}</p>
              {st === "pending" ? <span className="mt-2 inline-block rounded-full bg-tt-butter px-3 py-1 text-xs font-bold text-[#7A5A0E]">Being verified</span> : null}
              {st !== "approved" && st !== "pending" ? <span className="mt-2 inline-block rounded-full bg-tt-blush px-3 py-1 text-xs font-bold text-[#8C2F45]">Not active. Please contact us.</span> : null}
            </div>
            <div className="relative flex shrink-0 items-center gap-2">
              <span className="hidden items-center gap-2 sm:flex">{iconLinks}</span>
              <button type="button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Account settings" className="grid h-11 w-11 place-items-center rounded-full bg-white ring-1 ring-tt-line transition hover:bg-tt-milk">
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" fill="currentColor" /><circle cx="12" cy="12" r="2" fill="currentColor" /><circle cx="19" cy="12" r="2" fill="currentColor" /></svg>
              </button>
              {menu ? (
                <>
                  <button type="button" aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-30 cursor-default" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 top-12 z-40 w-52 overflow-hidden rounded-2xl bg-white py-1.5 shadow-[0_20px_40px_-18px_rgba(42,36,64,0.45)] ring-1 ring-tt-line">
                    <button type="button" onClick={() => { setMenu(false); setSheet("details"); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold hover:bg-tt-milk"><IconPen size={15} /> Edit details</button>
                    <button type="button" onClick={() => { setMenu(false); setSheet("password"); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold hover:bg-tt-milk"><IconLock size={15} /> Update password</button>
                    {customer.avatar ? <button type="button" onClick={() => { setMenu(false); void uploadPhoto(null, true); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold hover:bg-tt-milk"><IconCamera size={15} /> Remove photo</button> : null}
                    {wa ? <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold hover:bg-tt-milk"><IconChat size={15} /> Chat with us</a> : null}
                    <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-2.5 border-t border-tt-line px-4 py-2.5 text-left text-sm font-semibold text-tt-soft hover:bg-tt-milk">Log out</button>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="relative mt-4 flex items-center gap-2 pl-[88px] sm:hidden">{iconLinks}</div>
        </section>

        {/* Bean Points */}
        <div className="mt-4"><BeanPointsCard /></div>

        {/* quick actions */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link to="/shop" search={group ? { age: group } : {}} className="tt-acc-action" style={{ background: "#E6F6EC" }}>
            <span className="ic text-tt-leafdeep"><IconLeaf size={20} /></span>
            <span><b className="block text-[15px] leading-tight">Shop for {customer.baby_name || "baby"}</b><span className="text-xs text-tt-soft">{group ? `Foods for ${group.replace("m+", " months+")}` : "Fresh picks for little tummies"}</span></span>
          </Link>
          <a href="#orders" className="tt-acc-action" style={{ background: "#E5F1FA" }}>
            <span className="ic text-[#1F5873]"><IconTruck size={20} /></span>
            <span><b className="block text-[15px] leading-tight">Track my order</b><span className="text-xs text-tt-soft">{active.length ? `${active.length} on the way` : "Nothing on the way yet"}</span></span>
            {active.length ? <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-tt-coral ring-4 ring-white/70" aria-hidden="true" /> : null}
          </a>
          <button type="button" onClick={() => { setBabyG(customer.baby_gender || ""); setSheet("baby"); }} className="tt-acc-action" style={{ background: "#FFE9EF" }}>
            <span className="ic text-[#B83E61]"><IconHeart size={20} /></span>
            <span><b className="block text-[15px] leading-tight">{customer.baby_name ? `${customer.baby_name}'s profile` : "Add my little one"}</b><span className="text-xs text-tt-soft">{customer.baby_name ? "Name, birthday and more" : "Get age-matched picks"}</span></span>
          </button>
          {wa ? (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="tt-acc-action" style={{ background: "#F1ECFF" }}>
              <span className="ic text-[#4D3A86]"><IconChat size={20} /></span>
              <span><b className="block text-[15px] leading-tight">Chat with us</b><span className="text-xs text-tt-soft">We're happy to help</span></span>
            </a>
          ) : (
            <button type="button" onClick={() => setSheet("details")} className="tt-acc-action" style={{ background: "#F1ECFF" }}>
              <span className="ic text-[#4D3A86]"><IconPen size={20} /></span>
              <span><b className="block text-[15px] leading-tight">My details</b><span className="text-xs text-tt-soft">Address and contact</span></span>
            </button>
          )}
        </div>

        {/* orders */}
        <section id="orders" className="mt-8 scroll-mt-24">
          <h2 className="tt-acc-h2 tt-display text-xl font-bold sm:text-2xl"><span className="dot bg-[#E5F1FA] text-[#1F5873]"><IconBag size={17} /></span>{active.length ? "On its way to you" : "My orders"}</h2>
          {orders.length ? (
            <>
              {active.length ? <ul className="mt-3 space-y-3">{active.map((o) => <OrderJourney key={o.code} o={o} />)}</ul> : null}
              {past.length ? (
                <>
                  {active.length ? <h3 className="mt-6 text-sm font-bold uppercase tracking-wider text-tt-soft">Past orders</h3> : null}
                  <ul className="mt-3 space-y-2">{pastShown.map((o) => <OrderJourney key={o.code} o={o} compact />)}</ul>
                  {past.length > 3 ? <button type="button" onClick={() => setShowAll(!showAll)} className="mt-3 text-sm font-semibold text-tt-leaf hover:underline">{showAll ? "Show fewer" : `Show all ${past.length} past orders`}</button> : null}
                </>
              ) : null}
            </>
          ) : (
            <div className="mt-3 rounded-[24px] bg-white p-8 text-center ring-1 ring-tt-line">
              <div className="mx-auto mb-3 w-fit"><BeanJarIcon size={64} fill={0.25} /></div>
              <p className="tt-display text-lg font-bold">Your first order is waiting</p>
              <p className="mt-1 text-sm text-tt-soft">You'll follow each order here: Placed, Packing, On the way and Delivered.</p>
              <Link to="/shop" className="mt-4 inline-block rounded-full bg-tt-leaf px-6 py-3 text-sm font-semibold text-white">Start shopping</Link>
            </div>
          )}
        </section>

        {/* little one + delivery details */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <BabyBanner customer={customer} onEdit={() => { setBabyG(customer.baby_gender || ""); setSheet("baby"); }} />
          <section className="rounded-[24px] bg-white p-5 ring-1 ring-tt-line">
            <div className="flex items-center justify-between">
              <h3 className="tt-display text-lg font-bold">Delivery address</h3>
              <button type="button" onClick={() => setSheet("details")} className="text-sm font-semibold text-tt-leaf hover:underline">Edit</button>
            </div>
            {customer.address ? (
              <p className="mt-2 text-[15px] leading-relaxed"><b>{customer.name}</b><br />{customer.address}{customer.island ? `, ${customer.island}` : ""}{customer.email ? <><br /><span className="text-sm text-tt-soft">{customer.email}</span></> : null}</p>
            ) : (
              <button type="button" onClick={() => setSheet("details")} className="mt-3 w-full rounded-2xl border-2 border-dashed border-tt-line px-4 py-5 text-sm font-semibold text-tt-soft hover:border-tt-leaf">+ Add your delivery address</button>
            )}
          </section>
        </div>

        <TipCard group={group} baby={customer.baby_name || ""} />

        <section id="saved" className="mt-10 scroll-mt-24">
          <h2 className="tt-acc-h2 tt-display text-xl font-bold sm:text-2xl"><span className="dot bg-[#FFE9EF] text-[#B83E61]"><IconHeart size={17} /></span>Saved for later</h2>
          {savedProducts.length ? (
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">{savedProducts.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          ) : (
            <div className="mt-3 rounded-[24px] border-2 border-dashed border-tt-line p-7 text-center">
              <p className="text-sm font-semibold">Tap the heart on any product to save it here.</p>
              <Link to="/shop" className="mt-3 inline-block rounded-full bg-tt-blush px-5 py-2.5 text-sm font-semibold text-[#8C2F45]">Find favourites</Link>
            </div>
          )}
        </section>

        {picks.length ? (
          <section className="mt-10">
            <h2 className="tt-acc-h2 tt-display text-xl font-bold sm:text-2xl"><span className="dot bg-[#E6F6EC] text-tt-leafdeep"><IconLeaf size={17} /></span>Picked for {customer.baby_name || "your little one"}</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">{picks.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          </section>
        ) : null}
      </div>

      <Sheet open={sheet === "details"} onClose={() => setSheet("")} title="Edit details" tint="#D8F3E3">
        <DetailsForm customer={customer} onSaved={async () => { setSheet(""); await refresh(); flash("Details saved"); }} />
      </Sheet>
      <Sheet open={sheet === "password"} onClose={() => setSheet("")} title="Update password" tint="#E7E0FF">
        <PasswordForm onDone={() => { setSheet(""); flash("Password updated"); }} />
      </Sheet>
      <Sheet open={sheet === "baby"} onClose={() => setSheet("")} title="My little one" tint={babyTheme(babyG).bg}>
        <BabyForm customer={customer} onGender={setBabyG} onSaved={async () => { setSheet(""); await refresh(); flash("Saved!"); }} />
      </Sheet>

      {note ? <div className="tt-rise fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-tt-ink px-5 py-3 text-sm font-semibold text-white shadow-lg" role="status">{note}</div> : null}
    </div>
  );
}

const TIPS: Record<string, string[]> = {
  "": [
    "Always check the temperature of warmed food before serving, and stir well to remove hot spots.",
    "Keep your little one sitting upright and stay close while they eat.",
    "Offer sips of water from an open or free-flow cup with meals.",
  ],
  "6m+": [
    "Start with smooth, simple tastes and bring in new foods one at a time, a few days apart.",
    "A spoonful or two is plenty at first. Let baby set the pace.",
  ],
  "7m+": [
    "Move gently from smooth purees to thicker, mashed textures as baby gets comfortable.",
    "Pair a new veggie with a familiar favourite to make first tastes easier.",
  ],
  "9m+": [
    "Soft finger foods help baby practise picking up food and feeding themselves.",
    "A mix of textures through the day helps build chewing skills.",
  ],
  "12m+": [
    "Little ones can share many family meals now. Keep salt and sugar low.",
    "Small, regular meals and snacks suit busy toddlers best.",
  ],
};

/** A gentle, age-matched feeding tip; tap for another. */
function TipCard({ group, baby }: { group: string; baby: string }) {
  const list = [...(TIPS[group] ?? []), ...TIPS[""]!];
  const [i, setI] = useState(0);
  return (
    <section className="tt-tip tt-rise mt-6 flex flex-wrap items-center gap-4 rounded-[24px] p-5 sm:flex-nowrap sm:p-6">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-tt-leafdeep shadow-sm"><IconLeaf size={22} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-tt-leafdeep">A little tip{baby ? ` for ${baby}` : ""}</p>
        <p key={i} className="tt-rise mt-1 text-[15px] leading-relaxed text-tt-ink">{list[i % list.length]}</p>
        <p className="mt-1 text-[11px] text-tt-soft">General guidance. Your doctor knows your baby best.</p>
      </div>
      <button type="button" onClick={() => setI(i + 1)} className="shrink-0 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-tt-leafdeep ring-1 ring-[#CFE7D7] transition hover:-translate-y-0.5">Another tip</button>
    </section>
  );
}
