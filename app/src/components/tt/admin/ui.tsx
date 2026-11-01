import { useEffect, useState, type ReactNode } from "react";

import { IconUpload } from "../icons";

export async function postJson(body: Record<string, unknown>) {
  const r = await fetch("/api/admin/update", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const d = (await r.json().catch(() => ({}))) as { ok: boolean; error?: string; notified?: boolean | null; detail?: string };
  if (!d.ok) throw new Error(d.error || "Save failed");
  return d;
}

export async function postForm(fields: Record<string, string | Blob | null | undefined>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== null && v !== undefined) f.append(k, v);
  const r = await fetch("/api/admin/catalog", { method: "POST", body: f });
  const d = (await r.json().catch(() => ({}))) as { ok: boolean; error?: string; url?: string; id?: string; image?: string };
  if (!d.ok) throw new Error(d.error || "Save failed");
  return d;
}

export async function uploadFile(file: File): Promise<string> {
  const d = await postForm({ kind: "upload", file });
  return d.url ?? "";
}

export const inputCls = "mt-1.5 w-full rounded-2xl bg-tt-milk px-4 py-3 text-[15px] font-normal ring-1 ring-tt-line outline-none focus:ring-2 focus:ring-tt-leaf";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white p-5 ring-1 ring-tt-line sm:p-7 ${className}`}>{children}</div>;
}

export function Btn({ children, onClick, tone = "leaf", type = "button", disabled }: { children: ReactNode; onClick?: () => void; tone?: "leaf" | "ghost" | "danger" | "ink"; type?: "button" | "submit"; disabled?: boolean }) {
  const cls = {
    leaf: "bg-tt-leaf text-white hover:bg-tt-leafdeep",
    ink: "bg-tt-ink text-white",
    ghost: "bg-white ring-1 ring-tt-line hover:ring-tt-ink/40",
    danger: "bg-white text-[#A3283F] ring-1 ring-[#F3C1CB] hover:bg-[#FFF3F5]",
  }[tone];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${cls}`}>
      {children}
    </button>
  );
}

/** Image/video field: shows a preview, lets the admin upload a new file or paste a path. */
export function MediaField({ label, value, onChange, video = false }: { label: string; value: string; onChange: (v: string) => void; video?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="text-sm font-semibold">
      {label}
      <div className="mt-1.5 flex items-center gap-3 rounded-2xl bg-tt-milk p-2 ring-1 ring-tt-line">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white">
          {value ? (video ? <video src={value} muted className="h-full w-full object-cover" /> : <img src={value} alt="" className="h-full w-full object-cover" />) : null}
        </div>
        <input value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 bg-transparent px-1 text-xs font-normal text-tt-soft outline-none" placeholder={video ? "No video" : "No image"} />
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs ring-1 ring-tt-line">
          <IconUpload size={14} /> {busy ? "Uploading" : "Upload"}
          <input
            type="file"
            accept={video ? "video/mp4,video/webm,image/*" : "image/*"}
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              setErr("");
              try { onChange(await uploadFile(f)); } catch (x) { setErr(x instanceof Error ? x.message : "Upload failed"); } finally { setBusy(false); }
            }}
          />
        </label>
        {video && value ? <button type="button" className="shrink-0 px-2 text-xs text-tt-soft underline" onClick={() => onChange("")}>Remove</button> : null}
      </div>
      {err ? <p className="mt-1 text-xs text-[#A3283F]">{err}</p> : null}
    </div>
  );
}

export function useFlash() {
  const [msg, setMsg] = useState("");
  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg((cur) => (cur === m ? "" : cur)), 3500);
  };
  return { msg, flash };
}

/** Tiny toast used across the admin (survives cards moving between sections). */
export function toast(message: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("tt-toast", { detail: message }));
}

export function Toaster() {
  const [items, setItems] = useState<{ id: number; text: string }[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const id = Date.now() + Math.random();
      setItems((cur) => [...cur, { id, text: String((e as CustomEvent).detail) }]);
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== id)), 6000);
    };
    window.addEventListener("tt-toast", on);
    return () => window.removeEventListener("tt-toast", on);
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex max-w-sm flex-col gap-2">
      {items.map((t) => (
        <div key={t.id} className="tt-rise pointer-events-auto rounded-2xl bg-tt-ink px-5 py-4 text-sm font-medium text-white shadow-xl">{t.text}</div>
      ))}
    </div>
  );
}
