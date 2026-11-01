import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useAccount } from "../lib/account";
import { field } from "../components/tt/auth-forms";
import { IconLock } from "../components/tt/icons";

export const Route = createFileRoute("/reset")({
  validateSearch: (s: Record<string, unknown>): { token?: string } => ({ token: typeof s.token === "string" ? s.token : undefined }),
  head: () => ({ meta: [{ title: "Set a new password | Little Bean" }, { name: "robots", content: "noindex" }] }),
  component: ResetPage,
});

function ResetPage() {
  const { token } = Route.useSearch();
  const { refresh } = useAccount();
  const navigate = useNavigate();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState<{ state: "checking" | "valid" | "invalid"; name: string }>({ state: "checking", name: "" });
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!token) return;
    fetch(`/api/account/reset?token=${encodeURIComponent(token)}`)
      .then((r) => r.json() as Promise<{ valid?: boolean; name?: string }>)
      .then((d) => setCheck({ state: d.valid ? "valid" : "invalid", name: d.name ?? "" }))
      .catch(() => setCheck({ state: "valid", name: "" }));
  }, [token]);
  return (
    <div className="tt-wrap max-w-md py-16">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-tt-lilac text-[#4D3A86]"><IconLock size={28} /></div>
        <h1 className="tt-display tt-rise mt-4 text-4xl font-extrabold">{done ? "All set!" : check.name ? `Hi ${check.name}, set a new password` : "Set a new password"}</h1>
      </div>
      {!token ? (
        <p className="mt-6 rounded-3xl bg-white p-6 text-center text-tt-soft ring-1 ring-tt-line">This link is missing its code. Please use the full link from your SMS, or <Link to="/account" className="font-semibold text-tt-leaf underline">ask for a new one</Link>.</p>
      ) : done ? (
        <p className="mt-6 rounded-3xl bg-tt-sage p-6 text-center font-semibold text-tt-mintdeep">Your password is updated and you're logged in. Taking you to your account...</p>
      ) : check.state === "checking" ? (
        <p className="mt-6 text-center text-tt-soft">Checking your link...</p>
      ) : check.state === "invalid" ? (
        <div className="mt-6 rounded-3xl bg-white p-6 text-center ring-1 ring-tt-line">
          <p className="font-semibold">This link has expired or was already used.</p>
          <p className="mt-1 text-sm text-tt-soft">Reset links work once, for 30 minutes.</p>
          <Link to="/account" className="mt-4 inline-block rounded-full bg-tt-leaf px-6 py-3 text-sm font-semibold text-white">Get a new link</Link>
        </div>
      ) : (
        <form
          className="mt-6 space-y-4 rounded-[32px] bg-white p-7 ring-1 ring-tt-line"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr("");
            const f = new FormData(e.currentTarget);
            if (f.get("password") !== f.get("password2")) return setErr("The two passwords don't match.");
            setBusy(true);
            try {
              const r = await fetch("/api/account/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password: f.get("password") }) });
              const d = (await r.json()) as { ok: boolean; error?: string };
              if (!d.ok) throw new Error(d.error || "Something went wrong.");
              setDone(true);
              await refresh();
              window.setTimeout(() => void navigate({ to: "/account" }), 1200);
            } catch (x) {
              setErr(x instanceof Error ? x.message : "Something went wrong.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block text-sm font-semibold">New password<input name="password" type="password" required minLength={6} autoComplete="new-password" className={field} /></label>
          <label className="block text-sm font-semibold">Type it again<input name="password2" type="password" required minLength={6} autoComplete="new-password" className={field} /></label>
          {err ? <p className="rounded-2xl bg-tt-blush px-4 py-3 text-sm font-semibold text-[#8C2F45]" role="alert">{err}</p> : null}
          <button type="submit" disabled={busy} className="flex h-14 w-full items-center justify-center rounded-2xl bg-tt-leaf text-[16px] font-bold text-white disabled:opacity-60">{busy ? "Saving..." : "Save and log in"}</button>
        </form>
      )}
    </div>
  );
}
