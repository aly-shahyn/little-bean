import { useEffect, useState } from "react";

import { IconCheck } from "./icons";

export const field =
  "mt-1.5 w-full rounded-2xl bg-white px-4 py-3.5 text-[15.5px] font-normal outline-none ring-1 ring-tt-line focus:ring-2 focus:ring-tt-leaf";

type Mode = "login" | "register" | "forgot";

export function AuthForms({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [claim, setClaim] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentPhone, setSentPhone] = useState("");
  const [tgBot, setTgBot] = useState("");
  const [wait, setWait] = useState(0);
  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  async function resend() {
    setWait(60);
    await fetch("/api/account/forgot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: sentPhone }) }).catch(() => undefined);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (mode === "register" && data.password !== data.password2) return setErr("The two passwords don't match.");
    setBusy(true);
    try {
      const r = await fetch(`/api/account/${mode === "login" ? "login" : mode === "register" ? "register" : "forgot"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!(r.headers.get("content-type") || "").includes("application/json")) throw new Error(r.status === 403 ? "The site's security check stopped this request. Reload the page, wait a few seconds and try again." : "Something went wrong. Please try again.");
      const d = (await r.json()) as { ok: boolean; error?: string; telegram?: string; code?: string; claim?: boolean };
      if (!d.ok && d.code === "claim" && mode === "login") {
        // Shop-created account with no password yet: send the set-password link to this number.
        const f = await fetch("/api/account/forgot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: data.phone }) });
        const fd = (await f.json().catch(() => ({}))) as { telegram?: string };
        setClaim(true); setMode("forgot"); setTgBot(fd.telegram ?? ""); setSent(true); setSentPhone(String(data.phone ?? "")); setWait(60);
        return;
      }
      if (!d.ok) throw new Error(d.error || "Something went wrong.");
      if (d.claim) { setClaim(true); setMode("forgot"); setTgBot(d.telegram ?? ""); setSent(true); setSentPhone(String(data.phone ?? "")); setWait(60); return; }
      if (mode === "forgot") { setTgBot(d.telegram ?? ""); setSent(true); setSentPhone(String(data.phone ?? "")); setWait(60); }
      else onDone();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: Mode; label: string }[] = [
    { id: "login", label: "Log in" },
    { id: "register", label: "Create account" },
  ];

  return (
    <div className="mx-auto max-w-md">
      {mode !== "forgot" ? (
        <div className="grid grid-cols-2 rounded-full bg-white/80 p-1.5 shadow-[0_10px_30px_-18px_rgba(42,36,64,0.4)] ring-1 ring-white backdrop-blur">
          {tabs.map((m) => (
            <button key={m.id} type="button" onClick={() => { setMode(m.id); setErr(""); }} className={`rounded-full py-2.5 text-[15px] font-semibold transition-colors ${mode === m.id ? "bg-tt-leaf text-white shadow-md" : "text-tt-ink hover:bg-tt-milk"}`}>
              {m.label}
            </button>
          ))}
        </div>
      ) : null}

      {mode === "forgot" && sent ? (
        <div className="mt-5 rounded-[32px] bg-white/90 p-7 text-center shadow-[0_30px_60px_-34px_rgba(42,36,64,0.45)] ring-1 ring-white backdrop-blur-md">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-tt-sage text-tt-mintdeep"><IconCheck size={26} /></div>
          <h2 className="tt-display mt-4 text-2xl font-bold">{claim ? "Your orders are waiting" : tgBot ? "Get your link on Telegram" : "Check your messages"}</h2>
          {claim ? <p className="mt-2 text-[15px] font-semibold text-tt-leafdeep">We already have an account for this number from your orders with us. Set a password to see them.</p> : null}
          <p className="mt-2 text-[15px] text-tt-soft">
            {tgBot
              ? "If your Telegram is already connected, the reset link is waiting in your chat with us. First time? Open our bot, tap Start and share your number. The link arrives right away and works for 30 minutes."
              : "If this number has an account, a secure reset link is on its way by SMS. Tap it within 30 minutes to set a new password."}
          </p>
          {tgBot ? (
            <a href={`https://t.me/${tgBot}?start=reset`} target="_blank" rel="noreferrer" className="mt-5 inline-flex h-13 items-center justify-center gap-2.5 rounded-2xl bg-[#229ED9] px-6 py-3.5 font-bold text-white shadow-[0_14px_28px_-16px_rgba(34,158,217,0.9)] transition hover:-translate-y-0.5">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.9 4.3 18.8 19c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.3-4.7 8.6-7.8c.4-.3-.1-.5-.6-.2L6.9 12.9 2.3 11.5c-1-.3-1-1 .2-1.5l18-6.9c.8-.3 1.6.2 1.4 1.2Z" /></svg>
              Open Telegram
            </a>
          ) : null}
          <ol className="mt-5 grid grid-cols-3 gap-2 text-[12px] font-semibold">
            {["Link created", tgBot ? "Sent to Telegram" : "SMS sent", claim ? "Set your password" : "Set new password"].map((t, i) => (
              <li key={t} className="flex flex-col items-center gap-1.5">
                <span className={`grid h-8 w-8 place-items-center rounded-full text-white ${i < 2 ? "bg-tt-leaf" : "bg-tt-line text-tt-soft"}`}>{i < 2 ? <IconCheck size={15} /> : "3"}</span>
                <span className={i < 2 ? "text-tt-leafdeep" : "text-tt-soft"}>{t}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-col items-center gap-3">
            <button type="button" disabled={wait > 0} onClick={() => void resend()} className="rounded-full bg-tt-milk px-5 py-2.5 text-sm font-semibold ring-1 ring-tt-line disabled:opacity-60">
              {wait > 0 ? `Didn't get it? Send again in ${wait}s` : "Send the link again"}
            </button>
            <button type="button" onClick={() => { setMode("login"); setSent(false); setClaim(false); }} className="font-semibold text-tt-leaf underline underline-offset-4">Back to log in</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4 rounded-[32px] bg-white/90 p-7 shadow-[0_30px_60px_-34px_rgba(42,36,64,0.45)] ring-1 ring-white backdrop-blur-md">
          {mode === "forgot" ? (
            <div>
              <h2 className="tt-display text-2xl font-bold">Forgot your password?</h2>
              <p className="mt-1 text-sm text-tt-soft">Enter the mobile number you signed up with. We'll text you a secure link to set a new password.</p>
            </div>
          ) : null}
          {mode === "register" ? <label className="block text-sm font-semibold">Full name<input name="name" required autoComplete="name" className={field} /></label> : null}
          <label className="block text-sm font-semibold">{mode === "forgot" ? "Mobile number" : "Viber / WhatsApp number"}
            <input name="phone" required inputMode="tel" autoComplete="tel" placeholder="7XX XXXX" className={field} />
          </label>
          {mode !== "forgot" ? (
            <label className="block text-sm font-semibold">Password
              <input name="password" type="password" required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} className={field} />
            </label>
          ) : null}
          {mode === "register" ? (
            <>
              <label className="block text-sm font-semibold">Type password again<input name="password2" type="password" required minLength={6} autoComplete="new-password" className={field} /></label>
              <label className="block text-sm font-semibold">Area
                <select name="island" className={field} defaultValue="Male"><option>Male</option><option>Hulhumale</option><option>Villimale</option><option>Other island</option></select>
              </label>
              <label className="block text-sm font-semibold">Delivery address<input name="address" autoComplete="street-address" placeholder="House name, road, floor" className={field} /></label>
              <label className="block text-sm font-semibold">Email (optional)<input name="contact_email" type="email" autoComplete="email" className={field} /></label>
            </>
          ) : null}
          {err ? <p className="rounded-2xl bg-tt-blush px-4 py-3 text-sm font-semibold text-[#8C2F45]" role="alert">{err}</p> : null}
          <button type="submit" disabled={busy} className="flex h-14 w-full items-center justify-center rounded-2xl bg-tt-leaf text-[16px] font-bold text-white transition-colors hover:bg-tt-leafdeep disabled:opacity-60">
            {busy ? "Please wait..." : mode === "login" ? "Log in" : mode === "register" ? "Create my account" : "Send me a reset link"}
          </button>
          {mode === "login" ? (
            <button type="button" onClick={() => { setMode("forgot"); setErr(""); }} className="block w-full text-center text-sm font-semibold text-tt-leaf underline underline-offset-4">Forgot password?</button>
          ) : null}
          {mode === "forgot" ? (
            <button type="button" onClick={() => { setMode("login"); setErr(""); }} className="block w-full text-center text-sm text-tt-soft underline">Back to log in</button>
          ) : null}
          {mode === "register" ? <p className="text-center text-xs text-tt-soft">New accounts are checked by our team before the first order. We'll let you know on WhatsApp.</p> : null}
        </form>
      )}
    </div>
  );
}
