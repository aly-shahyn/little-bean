import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AGES, type Customer } from "../../lib/catalog";
import { ageGroup, ageMonths } from "./account-bits";
import { field } from "./auth-forms";

export type BabyTheme = { bg: string; soft: string; accent: string; ink: string; ring: string };
export function babyTheme(g?: string): BabyTheme {
  if (g === "boy") return { bg: "#E3F1FA", soft: "#F4FAFE", accent: "#357DAE", ink: "#1F5873", ring: "#A9D3EC" };
  if (g === "girl") return { bg: "#FFE3EB", soft: "#FFF5F7", accent: "#B83E61", ink: "#8C2F45", ring: "#F3B8C7" };
  return { bg: "#FFE9A8", soft: "#FFF6D6", accent: "#C2452B", ink: "#7A4A0E", ring: "#F5D98A" };
}
export const BABY_IMG = { boy: "/assets/memoji/kid.webp", girl: "/assets/memoji/kid-girl.webp" };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number) => String(n).padStart(2, "0");

/** A small friendly calendar. Value is "YYYY-MM-DD". */
function BirthdayPicker({ value, onChange, theme }: { value: string; onChange: (v: string) => void; theme: BabyTheme }) {
  const today = new Date();
  const init = /^\d{4}-\d{2}/.test(value) ? { y: Number(value.slice(0, 4)), m: Number(value.slice(5, 7)) - 1 } : { y: today.getFullYear(), m: today.getMonth() };
  const [view, setView] = useState(init);
  const thisYear = today.getFullYear();
  const years = useMemo(() => Array.from({ length: 7 }, (_, i) => thisYear - i), [thisYear]);
  const first = new Date(view.y, view.m, 1).getDay();
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const isFuture = (d: number) => new Date(view.y, view.m, d) > today;
  const step = (n: number) => setView((v) => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const canNext = new Date(view.y, view.m + 1, 1) <= today;

  return (
    <div className="mt-1.5 rounded-[24px] p-3 sm:p-4" style={{ background: theme.soft, boxShadow: `inset 0 0 0 1.5px ${theme.ring}` }}>
      <div className="tt-noscroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Year">
        {years.map((y) => (
          <button key={y} type="button" onClick={() => setView((v) => ({ y, m: y === today.getFullYear() ? Math.min(v.m, today.getMonth()) : v.m }))} aria-pressed={view.y === y}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors" style={view.y === y ? { background: theme.accent, color: "#fff" } : { background: "#fff", color: theme.ink }}>
            {y}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button type="button" onClick={() => step(-1)} disabled={view.y <= years[years.length - 1] && view.m === 0} className="grid h-9 w-9 place-items-center rounded-full bg-white text-lg font-bold disabled:opacity-30" style={{ color: theme.ink }} aria-label="Previous month">‹</button>
        <p className="tt-display flex-1 text-center text-lg font-bold" style={{ color: theme.ink }} aria-live="polite">{MONTHS[view.m]} {view.y}</p>
        <button type="button" disabled={!canNext} onClick={() => step(1)} className="grid h-9 w-9 place-items-center rounded-full bg-white text-lg font-bold disabled:opacity-30" style={{ color: theme.ink }} aria-label="Next month">›</button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wider" style={{ color: theme.ink, opacity: 0.6 }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const v = `${view.y}-${pad(view.m + 1)}-${pad(d)}`;
          const on = v === value;
          const isToday = view.y === today.getFullYear() && view.m === today.getMonth() && d === today.getDate();
          return (
            <button
              key={i}
              type="button"
              disabled={isFuture(d)}
              onClick={() => onChange(v)}
              className={`mx-auto grid h-9 w-9 place-items-center rounded-full text-sm font-semibold sm:h-10 sm:w-10 transition-transform hover:scale-110 disabled:opacity-25 disabled:hover:scale-100 ${on ? "text-white shadow-md" : "bg-white/70"}`}
              style={on ? { background: theme.accent } : isToday ? { boxShadow: `inset 0 0 0 1.5px ${theme.accent}`, color: theme.ink } : { color: "#2A2440" }}
              aria-pressed={on}
              aria-label={`${d} ${MONTHS[view.m]} ${view.y}`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BabyForm({ customer, onSaved, onGender }: { customer: Customer; onSaved: () => void; onGender: (g: string) => void }) {
  const [gender, setGender] = useState(customer.baby_gender || "");
  const [name, setName] = useState(customer.baby_name || "");
  const [birth, setBirth] = useState(/^\d{4}-\d{2}-\d{2}$/.test(customer.baby_birth || "") ? customer.baby_birth! : /^\d{4}-\d{2}$/.test(customer.baby_birth || "") ? `${customer.baby_birth}-01` : "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const theme = babyTheme(gender);
  const months = ageMonths(birth);
  const pick = (g: string) => { setGender(g); onGender(g); };

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await fetch("/api/account/me", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ baby_name: name, baby_birth: birth, baby_gender: gender }) });
        setBusy(false);
        if (r.ok) onSaved();
        else setErr("Could not save. Please try again.");
      }}
    >
      <div>
        <p className="text-sm font-semibold">Boy or girl?</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {(["boy", "girl"] as const).map((g) => {
            const t = babyTheme(g);
            const on = gender === g;
            return (
              <button key={g} type="button" onClick={() => pick(g)} aria-pressed={on}
                className={`relative flex items-center gap-3 rounded-[22px] p-3 text-left transition-all duration-300 ${on ? "scale-[1.02]" : "hover:-translate-y-0.5"}`}
                style={{ background: on ? t.bg : "#fff", boxShadow: on ? `inset 0 0 0 2.5px ${t.accent}` : "inset 0 0 0 1.5px #E6EFE6" }}>
                <img src={BABY_IMG[g]} alt="" className={`h-14 w-14 shrink-0 object-contain transition-transform duration-500 ${on ? "tt-bob" : ""}`} />
                <span>
                  <span className="tt-display block text-lg font-bold" style={{ color: t.ink }}>{g === "boy" ? "Boy" : "Girl"}</span>
                  <span className="block text-xs font-semibold" style={{ color: t.ink, opacity: 0.7 }}>{g === "boy" ? "Little prince" : "Little princess"}</span>
                </span>
                {on ? <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full text-xs font-bold text-white" style={{ background: t.accent }} aria-hidden="true">✓</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      <label className="block text-sm font-semibold">Baby's name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aisha" maxLength={40} className={field} style={{ boxShadow: `inset 0 0 0 1.5px ${theme.ring}` }} />
      </label>
      <div>
        <p className="text-sm font-semibold">Birthday</p>
        <BirthdayPicker value={birth} onChange={setBirth} theme={theme} />
        <p className="mt-2 min-h-5 text-sm font-semibold" style={{ color: theme.ink }}>
          {birth ? `${name || "Your little one"} is ${months === 0 ? "under 1 month" : `${months} month${months === 1 ? "" : "s"}`} old` : "Tap the day your little one was born."}
        </p>
      </div>
      {err ? <p className="text-sm font-semibold text-[#8C2F45]">{err}</p> : null}
      <button type="submit" disabled={busy} className="w-full rounded-2xl py-3.5 font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60" style={{ background: theme.accent }}>
        {busy ? "Saving..." : "Save"}
      </button>
    </form>
  );
}

/** Profile card about the baby, tinted by gender. */
export function BabyBanner({ customer, onEdit }: { customer: Customer; onEdit: () => void }) {
  const g = customer.baby_gender || "";
  const t = babyTheme(g);
  const months = ageMonths(customer.baby_birth || "");
  const group = months === null ? "" : ageGroup(months);
  const idx = AGES.findIndex((a) => a.id === group);
  const next = idx >= 0 && idx < AGES.length - 1 ? AGES[idx + 1] : null;
  const nextAt = next ? Number(next.id.replace("m+", "")) : 0;
  const has = !!(customer.baby_name || months !== null);
  const name = customer.baby_name || "Your baby";

  return (
    <section className="tt-baby-card" style={{ background: t.soft, borderColor: t.ring }}>

      <div className="relative flex items-start gap-4">
        <div className="tt-kid-avatar" style={{ background: t.bg }}>
          <img src={g === "girl" ? BABY_IMG.girl : BABY_IMG.boy} alt="Happy 3D baby face" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: t.ink }}>My little one</p>
          {has ? (
            <>
              <h3 className="tt-display mt-1 truncate text-[1.7rem] font-extrabold leading-tight" style={{ color: t.ink }}>{name}</h3>
              {months !== null ? (
                <span className="mt-1.5 inline-flex rounded-full bg-white/85 px-3 py-1 text-sm font-bold" style={{ color: t.ink }}>
                  {months === 0 ? "Newborn" : `${months} month${months === 1 ? "" : "s"} old`}
                </span>
              ) : null}
            </>
          ) : (
            <>
              <h3 className="tt-display mt-1 text-xl font-extrabold leading-tight" style={{ color: t.ink }}>Tell us about your baby</h3>
              <p className="mt-1 text-sm" style={{ color: t.ink }}>Add a name and birthday and we'll pick foods that fit their age.</p>
            </>
          )}
        </div>
      </div>

      {has && group ? (
        <div className="relative mt-5 rounded-2xl bg-white/75 p-4">
          <div className="flex items-center justify-between text-sm font-semibold" style={{ color: t.ink }}>
            <span>Ready for {AGES[idx]?.label ?? group} foods</span>
            {next && months !== null ? <span className="text-xs opacity-75">{next.id} in {nextAt - months} mo</span> : <span className="text-xs opacity-75">Big kid menu</span>}
          </div>
          <div className="mt-2.5 grid grid-cols-4 gap-1.5">
            {AGES.map((a, i) => <span key={a.id} className="h-2 rounded-full" style={{ background: i <= idx ? t.accent : t.ring, opacity: i <= idx ? 1 : 0.55 }} />)}
          </div>
        </div>
      ) : null}

      <div className="relative mt-5 flex flex-wrap gap-2">
        {has && group ? (
          <Link to="/shop" search={{ age: group }} className="rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5" style={{ background: t.accent }}>
            Shop for {customer.baby_name || "baby"} →
          </Link>
        ) : null}
        <button type="button" onClick={onEdit} className={`rounded-full px-5 py-2.5 text-sm font-bold transition-transform hover:-translate-y-0.5 ${has ? "bg-white" : "text-white"}`} style={has ? { color: t.ink } : { background: t.accent }}>
          {has ? "Edit" : "Add my little one"}
        </button>
      </div>
    </section>
  );
}
