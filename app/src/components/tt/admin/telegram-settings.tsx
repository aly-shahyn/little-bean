import { useState } from "react";

import type { Settings } from "../../../lib/catalog";
import { Btn, Card, inputCls, postJson } from "./ui";

/** Telegram bot used to deliver password reset links. */
export function TelegramSettings({ settings, onChange }: { settings: Settings; onChange: () => void }) {
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const saved = settings.telegram_token_set === "1";
  const username = settings.telegram_bot_username;

  async function connect() {
    setBusy(true);
    setMsg(token ? "Saving token..." : "Connecting...");
    try {
      if (token) await postJson({ kind: "settings", values: { telegram_bot_token: token.trim() } });
      const d = (await postJson({ kind: "telegram_connect" })) as { username?: string };
      setToken("");
      setMsg(`Connected to @${d.username ?? ""}. Password reset links will now go out through Telegram.`);
      onChange();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="tt-display text-xl font-bold">Telegram bot for password reset</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${saved && username ? "bg-tt-sage text-tt-mintdeep" : "bg-tt-butter text-[#7A5A0E]"}`}>{saved && username ? `Connected: @${username}` : "Not connected"}</span>
      </div>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-tt-soft">
        <li>A customer taps Forgot password and enters their number.</li>
        <li>If their Telegram is already connected, the bot sends the reset link straight away.</li>
        <li>If not, the website shows an "Open Telegram" button. They tap Start, share their number with one tap, and the link arrives.</li>
      </ol>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="text-sm font-semibold">Bot token (from @BotFather)
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder={saved ? "Saved. Paste a new one to replace it." : "123456789:ABC..."} className={inputCls} autoComplete="off" />
          <span className="mt-1 block text-xs font-normal text-tt-soft">Saved securely in your database and never shown again.</span>
        </label>
        <Btn onClick={() => void connect()} disabled={busy || (!token && !saved)}>{saved ? (token ? "Save & connect" : "Reconnect") : "Save & connect"}</Btn>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {saved ? <Btn tone="ghost" disabled={busy} onClick={async () => { try { const d = await postJson({ kind: "telegram_status" }); setMsg(d.detail ?? "OK"); } catch (e) { setMsg(e instanceof Error ? e.message : "Error"); } }}>Check status</Btn> : null}
        {username ? <a href={`https://t.me/${username}`} target="_blank" rel="noreferrer" className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#229ED9] ring-1 ring-tt-line">Open @{username}</a> : null}
      </div>
      {msg ? <p className="mt-3 rounded-2xl bg-tt-milk px-4 py-3 text-sm">{msg}</p> : null}
    </Card>
  );
}
