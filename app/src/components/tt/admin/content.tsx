import { useState } from "react";

import type { Product, Settings } from "../../../lib/catalog";
import { CONTENT_GROUPS, cRaw, type ContentGroup } from "../../../lib/content";
import { Btn, MediaField, inputCls, postJson } from "./ui";

function Group({ g, settings, onChange }: { g: ContentGroup; settings: Settings; onChange: () => void; products: Product[] }) {
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(g.fields.map((f) => [f.k, cRaw(settings, f.k)])));
  const [msg, setMsg] = useState("");
  const dirty = g.fields.some((f) => vals[f.k] !== cRaw(settings, f.k));
  return (
    <details className="tt-acc rounded-3xl bg-white ring-1 ring-tt-line">
      <summary className="flex items-center justify-between px-6 py-5">
        <span className="tt-display text-lg font-bold">{g.title}</span>
        <span className="text-sm text-tt-soft">{g.fields.length} fields</span>
      </summary>
      <form
        className="grid gap-4 border-t border-tt-line px-6 py-5 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await postJson({ kind: "settings", values: Object.fromEntries(Object.entries(vals).map(([k, v]) => [`c.${k}`, v])) });
            setMsg("Saved. Refresh the website to see it.");
            onChange();
          } catch (x) { setMsg(x instanceof Error ? x.message : "Error"); }
        }}
      >
        {g.fields.map((f) =>
          f.type === "image" || f.type === "video" ? (
            <div key={f.k} className="sm:col-span-2"><MediaField label={f.label} video={f.type === "video"} value={vals[f.k]} onChange={(x) => setVals((c) => ({ ...c, [f.k]: x }))} /></div>
          ) : (
            <label key={f.k} className={`text-sm font-semibold ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
              {f.label}
              {f.type === "textarea" ? (
                <textarea rows={f.k === "promises" ? 6 : 3} value={vals[f.k]} onChange={(e) => setVals((c) => ({ ...c, [f.k]: e.target.value }))} className={inputCls} />
              ) : (
                <input value={vals[f.k]} onChange={(e) => setVals((c) => ({ ...c, [f.k]: e.target.value }))} className={inputCls} />
              )}
            </label>
          ),
        )}
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Btn type="submit" disabled={!dirty}>Save {g.title.toLowerCase()}</Btn>
          <Btn tone="ghost" onClick={() => setVals(Object.fromEntries(g.fields.map((f) => [f.k, f.def])))}>Reset to original text</Btn>
          <span className="text-sm text-tt-soft">{msg}</span>
        </div>
      </form>
    </details>
  );
}

export function ContentPanel({ settings, onChange, products }: { settings: Settings; onChange: () => void; products: Product[] }) {
  return (
    <div className="space-y-3">
      <p className="rounded-3xl bg-tt-sage px-6 py-4 text-sm text-tt-mintdeep">
        Every text and photo on the website is here, section by section. Open a section, change it, and press Save. Products, brands and categories have their own tabs.
      </p>
      {CONTENT_GROUPS.map((g) => <Group key={g.id} g={g} settings={settings} onChange={onChange} products={products} />)}
    </div>
  );
}
