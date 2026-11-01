import { useState } from "react";
import { adminPost } from "../../../lib/admin-api";

import { Btn, Card, inputCls, toast } from "./ui";
import { fmtDate, type AdminUserT } from "./types";

const ROLE_INFO = {
  super: { label: "Super Admin", tint: "bg-tt-butter text-[#7A5A0E]", text: "Everything, including deleting completed orders and managing logins." },
  admin: { label: "Admin", tint: "bg-tt-lilac text-[#4D3A86]", text: "Everything except deleting completed orders and managing logins." },
} as const;

async function call(body: Record<string, unknown>) {
  const { ok, d } = await adminPost("/api/admin/team", body);
  if (!ok) throw new Error(d.error || "Could not save. Please try again.");
}

function Row({ u, me, onChange }: { u: AdminUserT; me: AdminUserT; onChange: () => void }) {
  const [open, setOpen] = useState<"" | "edit" | "password">("");
  const [name, setName] = useState(u.name);
  const [role, setRole] = useState(u.role);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const self = u.id === me.id;
  const run = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    try { await call({ id: u.id, ...body }); toast(ok); setOpen(""); setPw(""); onChange(); } catch (e) { toast(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  };
  return (
    <li className={`rounded-3xl bg-white p-5 ring-1 ring-tt-line ${u.active ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-tt-milk text-lg font-bold text-tt-leafdeep">{(u.name || u.username).charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{u.name || u.username} {self ? <span className="text-xs font-normal text-tt-soft">(you)</span> : null}</p>
          <p className="text-xs text-tt-soft">@{u.username} · {u.last_login ? `last sign-in ${fmtDate(u.last_login)}` : "never signed in"}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_INFO[u.role].tint}`}>{ROLE_INFO[u.role].label}</span>
        {!u.active ? <span className="rounded-full bg-tt-milk px-3 py-1 text-xs font-bold text-tt-soft">Disabled</span> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn tone={open === "edit" ? "ink" : "ghost"} onClick={() => setOpen(open === "edit" ? "" : "edit")}>Edit & role</Btn>
        <Btn tone={open === "password" ? "ink" : "ghost"} onClick={() => setOpen(open === "password" ? "" : "password")}>Reset password</Btn>
        {!self ? <Btn tone="ghost" disabled={busy} onClick={() => void run({ action: "update", name: u.name, role: u.role, active: !u.active }, u.active ? "Login disabled" : "Login enabled")}>{u.active ? "Disable" : "Enable"}</Btn> : null}
        {!self ? <Btn tone="danger" disabled={busy} onClick={() => { if (window.confirm(`Delete the login @${u.username}? They will be signed out.`)) void run({ action: "delete" }, "Login deleted"); }}>Delete</Btn> : null}
      </div>
      {open === "edit" ? (
        <form className="mt-4 grid gap-3 rounded-2xl bg-tt-milk p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); void run({ action: "update", name, role, active: !!u.active }, "Saved"); }}>
          <label className="text-xs font-semibold">Name<input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></label>
          <label className="text-xs font-semibold">Role
            <select value={role} onChange={(e) => setRole(e.target.value as AdminUserT["role"])} disabled={self} className={inputCls}>
              <option value="admin">Admin</option>
              <option value="super">Super Admin</option>
            </select>
          </label>
          <Btn type="submit" disabled={busy}>Save</Btn>
          {self ? <p className="text-xs text-tt-soft sm:col-span-3">You can't change your own role. Another Super Admin can.</p> : null}
        </form>
      ) : null}
      {open === "password" ? (
        <form className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl bg-tt-milk p-4" onSubmit={(e) => { e.preventDefault(); void run({ action: "password", secret: pw }, `Password changed. @${u.username} has been signed out.`); }}>
          <label className="min-w-0 flex-1 text-xs font-semibold">New password (8+ characters)<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} required autoComplete="new-password" className={inputCls} /></label>
          <Btn type="submit" disabled={busy}>Set password</Btn>
        </form>
      ) : null}
    </li>
  );
}

/** Super Admin: create logins for the team and assign roles. */
export function TeamPanel({ users, me, onChange }: { users: AdminUserT[]; me: AdminUserT; onChange: () => void }) {
  const [f, setF] = useState({ name: "", username: "", password: "", role: "admin" as AdminUserT["role"] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {(["super", "admin"] as const).map((r) => (
          <div key={r} className="rounded-3xl bg-white p-5 ring-1 ring-tt-line">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_INFO[r].tint}`}>{ROLE_INFO[r].label}</span>
            <p className="mt-2 text-sm text-tt-soft">{ROLE_INFO[r].text}</p>
          </div>
        ))}
      </div>
      <Card>
        <h3 className="tt-display text-xl font-bold">Create a new login</h3>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_180px_auto] lg:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr("");
            setBusy(true);
            try { await call({ action: "create", name: f.name, login_name: f.username, secret: f.password, role: f.role }); toast(`Login @${f.username} created`); setF({ name: "", username: "", password: "", role: "admin" }); onChange(); } catch (x) { setErr(x instanceof Error ? x.message : "Error"); } finally { setBusy(false); }
          }}
        >
          <label className="text-xs font-semibold">Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Aishath" className={inputCls} /></label>
          <label className="text-xs font-semibold">Username<input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, "") })} required placeholder="e.g. aishath" autoComplete="off" className={inputCls} /></label>
          <label className="text-xs font-semibold">Password<input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={8} autoComplete="new-password" className={inputCls} /></label>
          <label className="text-xs font-semibold">Role
            <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as AdminUserT["role"] })} className={inputCls}>
              <option value="admin">Admin</option>
              <option value="super">Super Admin</option>
            </select>
          </label>
          <Btn type="submit" disabled={busy}>Create login</Btn>
        </form>
        {err ? <p className="mt-3 text-sm font-semibold text-[#A3283F]">{err}</p> : null}
        <p className="mt-3 text-xs text-tt-soft">Share the username and password with the person. They sign in at /admin and can change their password in Settings.</p>
      </Card>
      <ul className="space-y-3">{users.map((u) => <Row key={u.id} u={u} me={me} onChange={onChange} />)}</ul>
    </div>
  );
}
