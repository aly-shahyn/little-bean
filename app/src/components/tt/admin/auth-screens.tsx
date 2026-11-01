import { useEffect, useState } from "react";

import { adminPost } from "../../../lib/admin-api";
import { Logo } from "../logo";
import { inputCls } from "./ui";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#EEF6EE] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3"><Logo /><span className="rounded-full bg-tt-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">Admin</span></div>
        {children}
      </div>
    </div>
  );
}

export function SetupScreen({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  return (
    <Shell>
      <form
        className="rounded-[32px] bg-white p-8 ring-1 ring-tt-line"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr("");
          if (pw.length < 8) return setErr("Use at least 8 characters.");
          if (pw !== pw2) return setErr("The two passwords don't match.");
          const { ok, d } = await adminPost("/api/admin/session", { setup: true, login_name: username, name, secret: pw });
          if (ok) return onDone();
          setErr(d.error || "Could not create that login.");
          if (d.code === "already_configured") setTimeout(onDone, 1500);
        }}
      >
        <h1 className="tt-display text-3xl font-extrabold">Create the Super Admin login</h1>
        <p className="mt-2 text-sm text-tt-soft">This is the owner login. You can add logins for your team afterwards.</p>
        <label className="mt-6 block text-sm font-semibold">Your name<input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></label>
        <label className="mt-4 block text-sm font-semibold">Username<input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} autoComplete="username" placeholder="e.g. shahyn" className={inputCls} /></label>
        <label className="mt-4 block text-sm font-semibold">Password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" className={inputCls} /></label>
        <label className="mt-4 block text-sm font-semibold">Type it again<input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" className={inputCls} /></label>
        {err ? <p className="mt-3 text-sm font-semibold text-[#A3283F]">{err}</p> : null}
        <button type="submit" className="mt-5 w-full rounded-2xl bg-tt-leaf py-3.5 font-semibold text-white">Save and open admin</button>
      </form>
    </Shell>
  );
}

export function LoginScreen({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [mode, setMode] = useState<"login" | "forgot" | "sent" | "reset">("login");
  const [sentTo, setSentTo] = useState("");
  const [token, setToken] = useState("");
  const [resetFor, setResetFor] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const call = (body: Record<string, unknown>) => adminPost("/api/admin/session", body);

  // A reset link from WhatsApp opens /admin?reset=...
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("reset") || "";
    if (!t) return;
    setToken(t);
    setMode("reset");
    void call({ reset_check: true, token: t }).then(({ d }) => setResetFor(d.username ?? null));
  }, []);

  if (mode === "reset") {
    return (
      <Shell>
        <form
          className="rounded-[32px] bg-white p-8 ring-1 ring-tt-line"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr("");
            setBusy(true);
            const { ok, d } = await call({ reset: true, token, secret: pw });
            setBusy(false);
            if (!ok) return setErr(d.error || "That didn't work.");
            window.history.replaceState(null, "", "/admin");
            setPw("");
            onDone();
          }}
        >
          <h1 className="tt-display text-3xl font-extrabold">Set a new password</h1>
          {resetFor === undefined ? <p className="mt-2 text-sm text-tt-soft">Checking your link...</p> : resetFor ? (
            <>
              <p className="mt-2 text-sm text-tt-soft">For the login <b className="text-tt-ink">{resetFor}</b>. Use at least 8 characters and save it in your password manager.</p>
              <input type="text" value={resetFor} autoComplete="username" readOnly hidden />
              <label className="mt-6 block text-sm font-semibold">New password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} required autoComplete="new-password" className={inputCls} /></label>
              {err ? <p className="mt-3 text-sm font-semibold text-[#A3283F]">{err}</p> : null}
              <button type="submit" disabled={busy} className="mt-5 w-full rounded-2xl bg-tt-ink py-3.5 font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Save and sign in"}</button>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-[#A3283F]">This link has expired or was already used.</p>
              <button type="button" onClick={() => { window.history.replaceState(null, "", "/admin"); setMode("forgot"); }} className="mt-5 w-full rounded-2xl bg-tt-ink py-3.5 font-semibold text-white">Send a new link</button>
            </>
          )}
        </form>
      </Shell>
    );
  }

  if (mode === "forgot" || mode === "sent") {
    return (
      <Shell>
        <form
          className="rounded-[32px] bg-white p-8 ring-1 ring-tt-line"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr("");
            setBusy(true);
            const { ok, d } = await call({ forgot: true, login_name: username });
            setBusy(false);
            if (!ok) return setErr(d.error || "That didn't work.");
            setSentTo(d.to || "");
            setMode("sent");
          }}
        >
          <h1 className="tt-display text-3xl font-extrabold">Forgot password</h1>
          {mode === "sent" ? (
            <p className="mt-4 rounded-2xl bg-tt-sage px-4 py-3 text-sm text-tt-mintdeep">If <b>{username}</b> is a login, a reset link is on its way to the shop's WhatsApp{sentTo ? ` (${sentTo})` : ""}. It works once, for 30 minutes.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-tt-soft">We'll send a one-time reset link to the shop's WhatsApp number.</p>
              <label className="mt-6 block text-sm font-semibold">Username<input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} required autoComplete="username" autoCapitalize="none" className={inputCls} /></label>
              {err ? <p className="mt-3 text-sm font-semibold text-[#A3283F]">{err}</p> : null}
              <button type="submit" disabled={busy} className="mt-5 w-full rounded-2xl bg-tt-ink py-3.5 font-semibold text-white disabled:opacity-60">{busy ? "Sending..." : "Send reset link"}</button>
            </>
          )}
          <button type="button" onClick={() => { setMode("login"); setErr(""); }} className="mt-4 block w-full text-center text-sm text-tt-soft underline">Back to sign in</button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <form
        className="rounded-[32px] bg-white p-8 ring-1 ring-tt-line"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr("");
          const { ok, d } = await call({ login_name: username, secret: pw });
          if (ok) { setPw(""); onDone(); } else setErr(d.error || "Sign-in is temporarily unavailable. Please try again later.");
        }}
      >
        <h1 className="tt-display text-3xl font-extrabold">Sign in</h1>
        <p className="mt-2 text-sm text-tt-soft">Little Bean back office.</p>
        <label className="mt-6 block text-sm font-semibold">Username<input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} autoComplete="username" autoCapitalize="none" className={inputCls} /></label>
        <label className="mt-4 block text-sm font-semibold">Password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" className={inputCls} /></label>
        {err ? <p className="mt-3 text-sm font-semibold text-[#A3283F]">{err}</p> : null}
        <button type="submit" className="mt-5 w-full rounded-2xl bg-tt-ink py-3.5 font-semibold text-white">Sign in</button>
        <button type="button" onClick={() => { setMode("forgot"); setErr(""); }} className="mt-4 block w-full text-center text-sm font-semibold text-tt-leaf underline">Forgot password?</button>
        <a href="/" className="mt-2 block text-center text-sm text-tt-soft underline">Back to the shop</a>
      </form>
    </Shell>
  );
}

export function PasswordCard({ label }: { label?: string }) {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-3xl bg-white p-6 ring-1 ring-tt-line sm:p-7"
      onSubmit={async (e) => {
        e.preventDefault();
        const { ok, d } = await adminPost("/api/admin/session", { secret: pw, change: true });
        setMsg(ok ? "Password changed." : d.error || "Use at least 8 characters.");
        if (ok) setPw("");
      }}
    >
      <label className="text-sm font-semibold">Change my password{label ? ` (${label})` : ""}
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" className="mt-1.5 block w-64 rounded-2xl bg-tt-milk px-4 py-3 font-normal ring-1 ring-tt-line" />
      </label>
      <button type="submit" className="rounded-full px-5 py-3 text-sm font-semibold ring-1 ring-tt-line">Update password</button>
      <span className="text-sm text-tt-soft">{msg}</span>
    </form>
  );
}

