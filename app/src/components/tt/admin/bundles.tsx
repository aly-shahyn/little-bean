import { useState } from "react";

import { AGES, bundleItems, mvr, type Bundle, type Product } from "../../../lib/catalog";
import { Btn, Card, MediaField, inputCls, postJson, toast } from "./ui";

type Draft = { id: string; name: string; blurb: string; image: string; price: string; kind: string; age: string; active: boolean; sort: string; items: { id: string; qty: number }[] };
const blank: Draft = { id: "", name: "", blurb: "", image: "", price: "", kind: "bundle", age: "", active: true, sort: "0", items: [{ id: "", qty: 1 }, { id: "", qty: 1 }] };
const toDraft = (b: Bundle): Draft => ({ id: b.id, name: b.name, blurb: b.blurb, image: b.image, price: String(b.price), kind: b.kind, age: b.age, active: !!b.active, sort: String(b.sort), items: bundleItems(b) });

function Editor({ d0, products, onDone }: { d0: Draft; products: Product[]; onDone: () => void }) {
  const [d, setD] = useState<Draft>(d0);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((c) => ({ ...c, [k]: v }));
  const items = d.items.filter((x) => x.id);
  const worth = items.reduce((s, x) => s + (products.find((p) => p.id === x.id)?.price ?? 0) * x.qty, 0);
  const price = Math.floor(Number(d.price) || 0);

  async function save() {
    setBusy(true);
    try {
      await postJson({ kind: "bundle_save", id: d.id, name: d.name, blurb: d.blurb, image: d.image, price, bundle_kind: d.kind, items, age: d.age, active: d.active, sort: d.sort });
      toast("Bundle saved");
      onDone();
    } catch (e) { toast(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  }

  return (
    <Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Name<input value={d.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="e.g. First Tastes Starter Pack" /></label>
        <label className="text-sm font-semibold">Type
          <select value={d.kind} onChange={(e) => set("kind", e.target.value)} className={inputCls}>
            <option value="bundle">Bundle</option>
            <option value="saver">Super saver deal</option>
          </select>
        </label>
        <label className="text-sm font-semibold sm:col-span-2">Short description<input value={d.blurb} onChange={(e) => set("blurb", e.target.value)} className={inputCls} /></label>
        <label className="text-sm font-semibold">Age
          <select value={d.age} onChange={(e) => set("age", e.target.value)} className={inputCls}>
            <option value="">Any age</option>
            {AGES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Order on page<input type="number" value={d.sort} onChange={(e) => set("sort", e.target.value)} className={inputCls} /></label>
      </div>

      <p className="mt-5 text-sm font-semibold">Products in this bundle</p>
      <ul className="mt-2 space-y-2">
        {d.items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <select value={it.id} onChange={(e) => set("items", d.items.map((x, k) => (k === i ? { ...x, id: e.target.value } : x)))} className={`${inputCls} mt-0 flex-1`}>
              <option value="">Choose a product</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({mvr(p.price)})</option>)}
            </select>
            <input type="number" min={1} max={20} value={it.qty} onChange={(e) => set("items", d.items.map((x, k) => (k === i ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x)))} className={`${inputCls} mt-0 w-20`} aria-label="Quantity" />
            <Btn tone="ghost" onClick={() => set("items", d.items.filter((_, k) => k !== i))}>Remove</Btn>
          </li>
        ))}
      </ul>
      <div className="mt-2"><Btn tone="ghost" onClick={() => set("items", [...d.items, { id: "", qty: 1 }])}>Add product</Btn></div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Bundle price (MVR)
          <input type="number" min={1} value={d.price} onChange={(e) => set("price", e.target.value)} className={inputCls} />
          <span className="mt-1 block text-xs font-normal text-tt-soft">Separately {mvr(worth)}{price && worth > price ? ` · customers save ${mvr(worth - price)} (${Math.round(((worth - price) / worth) * 100)}%)` : ""}</span>
        </label>
        <label className="flex items-center gap-3 self-center text-sm font-semibold"><input type="checkbox" checked={d.active} onChange={(e) => set("active", e.target.checked)} className="h-5 w-5 accent-[#1B8053]" /> Show on the website</label>
        <div className="sm:col-span-2"><MediaField label="Photo (optional, otherwise the product photos are shown)" value={d.image} onChange={(v) => set("image", v)} /></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Btn onClick={() => void save()} disabled={busy}>Save bundle</Btn>
        <Btn tone="ghost" onClick={onDone}>Cancel</Btn>
      </div>
    </Card>
  );
}

export function BundlesPanel({ bundles, products, onChange }: { bundles: Bundle[]; products: Product[]; onChange: () => void }) {
  const [edit, setEdit] = useState<Draft | null>(null);
  if (edit) return <Editor d0={edit} products={products} onDone={() => { setEdit(null); onChange(); }} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-tt-soft">Bundles show on the home page, the shop and on each product inside them. Super saver deals get a coral badge.</p>
        <span className="ml-auto"><Btn onClick={() => setEdit({ ...blank })}>New bundle</Btn></span>
      </div>
      {bundles.length ? bundles.map((b) => {
        const items = bundleItems(b);
        const worth = items.reduce((s, x) => s + (products.find((p) => p.id === x.id)?.price ?? 0) * x.qty, 0);
        return (
          <Card key={b.id}>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${b.kind === "saver" ? "bg-tt-coral text-tt-ink" : "bg-tt-lilac text-[#4D3A86]"}`}>{b.kind === "saver" ? "Super saver" : "Bundle"}</span>
              <span className="tt-display text-lg font-bold">{b.name}</span>
              {!b.active ? <span className="rounded-full bg-tt-milk px-2.5 py-1 text-xs font-semibold text-tt-soft">Hidden</span> : null}
              <span className="ml-auto text-right"><b>{mvr(b.price)}</b> <span className="text-sm text-tt-soft line-through">{mvr(worth)}</span></span>
            </div>
            <p className="mt-2 text-sm text-tt-soft">{items.map((x) => `${x.qty} x ${products.find((p) => p.id === x.id)?.name ?? x.id}`).join(" · ")}</p>
            <div className="mt-3 flex gap-2">
              <Btn tone="ghost" onClick={() => setEdit(toDraft(b))}>Edit</Btn>
              <Btn tone="danger" onClick={async () => { if (!window.confirm(`Delete ${b.name}?`)) return; await postJson({ kind: "bundle_delete", id: b.id }); toast("Bundle deleted"); onChange(); }}>Delete</Btn>
            </div>
          </Card>
        );
      }) : <Card><p className="text-center text-tt-soft">No bundles yet.</p></Card>}
    </div>
  );
}
