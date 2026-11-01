import { useState } from "react";

import { AGE_OPTIONS, mvr, type Brand, type Category, type Product } from "../../../lib/catalog";
import { Btn, Card, MediaField, inputCls, postForm } from "./ui";

const EMPTY: Product = {
  id: "", name: "", brand: "", category: "", age: "6m+", price: 0, weight: "", image: "/assets/samples/snacks.jpg", short: "", description: "",
  ingredients: "", highlights: "", allergy: "", serve: "", in_stock: 1, featured: 0, sort: 100, price_confirmed: 1, hidden: 0,
};

function Editor({ p, brands, categories, onDone, onCancel }: { p: Product; brands: Brand[]; categories: Category[]; onDone: () => void; onCancel: () => void }) {
  const [v, setV] = useState<Product>({ ...p, brand: p.brand || brands[0]?.id || "", category: p.category || categories[0]?.id || "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = <K extends keyof Product>(k: K, val: Product[K]) => setV((cur) => ({ ...cur, [k]: val }));
  const text = (k: keyof Product, label: string, long = false, hint = "") => (
    <label className={`text-sm font-semibold ${long ? "sm:col-span-2" : ""}`}>
      {label}
      {long ? (
        <textarea rows={3} value={String(v[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} className={inputCls} />
      ) : (
        <input value={String(v[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} className={inputCls} />
      )}
      {hint ? <span className="mt-1 block text-xs font-normal text-tt-soft">{hint}</span> : null}
    </label>
  );

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr("");
        try {
          await postForm({
            kind: "product_save", id: v.id, name: v.name, brand: v.brand, category: v.category, age: v.age, price: String(v.price), weight: v.weight,
            image: v.image, short: v.short, description: v.description, ingredients: v.ingredients, highlights: v.highlights, allergy: v.allergy,
            serve: v.serve, in_stock: v.in_stock ? "1" : "0", featured: v.featured ? "1" : "0", sort: String(v.sort), hidden: v.hidden ? "1" : "0",
          });
          onDone();
        } catch (x) { setErr(x instanceof Error ? x.message : "Save failed"); } finally { setBusy(false); }
      }}
    >
      {text("name", "Product name")}
      <label className="text-sm font-semibold">Price (MVR)<input inputMode="numeric" value={v.price} onChange={(e) => set("price", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)} className={inputCls} /></label>
      <label className="text-sm font-semibold">Brand
        <select value={v.brand} onChange={(e) => set("brand", e.target.value)} className={inputCls}>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      </label>
      <label className="text-sm font-semibold">Category
        <select value={v.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </label>
      <label className="text-sm font-semibold">Age
        <select value={v.age} onChange={(e) => set("age", e.target.value)} className={inputCls}>{AGE_OPTIONS.map((a) => <option key={a}>{a}</option>)}</select>
      </label>
      {text("weight", "Pack size", false, "e.g. 50g")}
      <div className="sm:col-span-2"><MediaField label="Photo" value={v.image} onChange={(x) => set("image", x)} /></div>
      {text("short", "One-line summary (shown under the name)", true)}
      {text("description", "Description", true)}
      {text("highlights", "Highlights (one per line)", true)}
      {text("ingredients", "Ingredients (one per line, leave empty to say 'see pack')", true)}
      {text("allergy", "Allergy information", true)}
      {text("serve", "How to serve", true)}
      <label className="text-sm font-semibold">Order on page (lower shows first)<input inputMode="numeric" value={v.sort} onChange={(e) => set("sort", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)} className={inputCls} /></label>
      <div className="flex flex-wrap items-center gap-5 pt-6 text-sm font-semibold">
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!v.in_stock} onChange={(e) => set("in_stock", e.target.checked ? 1 : 0)} className="h-4 w-4 accent-[#1B8053]" /> In stock</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!v.featured} onChange={(e) => set("featured", e.target.checked ? 1 : 0)} className="h-4 w-4 accent-[#1B8053]" /> Mom favourite (homepage)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!v.hidden} onChange={(e) => set("hidden", e.target.checked ? 1 : 0)} className="h-4 w-4 accent-[#1B8053]" /> Hide from shop</label>
      </div>
      {err ? <p className="text-sm font-semibold text-[#A3283F] sm:col-span-2">{err}</p> : null}
      <div className="flex gap-2 sm:col-span-2">
        <Btn type="submit" disabled={busy}>{busy ? "Saving..." : v.id ? "Save product" : "Add product"}</Btn>
        <Btn tone="ghost" onClick={onCancel}>Cancel</Btn>
      </div>
    </form>
  );
}

export function ProductsPanel({ products, brands, categories, onChange }: { products: Product[]; brands: Brand[]; categories: Category[]; onChange: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const shown = products.filter((p) => !q || `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(q.toLowerCase()));
  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3">
        <Btn onClick={() => setEditing("__new__")}>+ Add product</Btn>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="ml-auto rounded-full bg-tt-milk px-4 py-2.5 text-sm ring-1 ring-tt-line" />
      </Card>
      {editing === "__new__" ? (
        <Card><h3 className="tt-display mb-4 text-xl font-bold">New product</h3><Editor p={EMPTY} brands={brands} categories={categories} onDone={() => { setEditing(null); onChange(); }} onCancel={() => setEditing(null)} /></Card>
      ) : null}
      <ul className="space-y-3">
        {shown.map((p) => (
          <li key={p.id} className="rounded-3xl bg-white p-4 ring-1 ring-tt-line">
            <div className="flex items-center gap-4">
              <img src={p.image} alt="" className="h-20 w-16 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug">{p.name}</p>
                <p className="text-xs text-tt-soft">{brandName(p.brand)} · {p.age} · {mvr(p.price)}</p>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                  {!p.in_stock ? <span className="rounded-full bg-tt-blush px-2 py-0.5">Out of stock</span> : null}
                  {p.hidden ? <span className="rounded-full bg-[#EEE] px-2 py-0.5">Hidden</span> : null}
                  {p.featured ? <span className="rounded-full bg-tt-sage px-2 py-0.5">Favourite</span> : null}
                  {!p.price_confirmed ? <span className="rounded-full bg-tt-butter px-2 py-0.5">Estimated price</span> : null}
                  {p.image.startsWith("/assets/samples") ? <span className="rounded-full bg-tt-peach px-2 py-0.5">Sample photo</span> : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <Btn tone="ghost" onClick={() => setEditing(editing === p.id ? null : p.id)}>{editing === p.id ? "Close" : "Edit"}</Btn>
                <Btn tone="danger" onClick={async () => { if (window.confirm(`Delete "${p.name}"? This can't be undone.`)) { await postForm({ kind: "product_delete", id: p.id }); onChange(); } }}>Delete</Btn>
              </div>
            </div>
            {editing === p.id ? (
              <div className="mt-5 border-t border-tt-line pt-5"><Editor p={p} brands={brands} categories={categories} onDone={() => { setEditing(null); onChange(); }} onCancel={() => setEditing(null)} /></div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
