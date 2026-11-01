import { useState } from "react";

import type { Brand, Category } from "../../../lib/catalog";
import { Btn, Card, MediaField, inputCls, postForm } from "./ui";

function BrandRow({ b, isNew, onDone }: { b: Brand; isNew?: boolean; onDone: () => void }) {
  const [v, setV] = useState(b);
  const [msg, setMsg] = useState("");
  const set = (k: keyof Brand, val: string | number) => setV((c) => ({ ...c, [k]: val }));
  return (
    <form
      className="grid gap-3 rounded-3xl bg-white p-5 ring-1 ring-tt-line sm:grid-cols-[1fr_1fr_90px]"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await postForm({ kind: "brand_save", id: v.id, name: v.name, origin: v.origin, about: v.about, logo: v.logo ?? "", sort: String(v.sort), hidden: v.hidden ? "1" : "0" });
          setMsg("Saved");
          onDone();
        } catch (x) { setMsg(x instanceof Error ? x.message : "Error"); }
      }}
    >
      <label className="text-sm font-semibold">Brand name<input value={v.name} onChange={(e) => set("name", e.target.value)} className={inputCls} /></label>
      <label className="text-sm font-semibold">Country<input value={v.origin} onChange={(e) => set("origin", e.target.value)} className={inputCls} /></label>
      <label className="text-sm font-semibold">Order<input inputMode="numeric" value={v.sort} onChange={(e) => set("sort", Number(e.target.value) || 0)} className={inputCls} /></label>
      <label className="text-sm font-semibold sm:col-span-3">About<textarea rows={2} value={v.about} onChange={(e) => set("about", e.target.value)} className={inputCls} /></label>
      <div className="sm:col-span-3"><MediaField label="Logo (shown in the scrolling strip on the home page; PNG with transparent background works best)" value={v.logo ?? ""} onChange={(x) => set("logo", x)} /></div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <Btn type="submit">{isNew ? "Add brand" : "Save"}</Btn>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!v.hidden} onChange={(e) => set("hidden", e.target.checked ? 1 : 0)} className="h-4 w-4 accent-[#1B8053]" /> Hide</label>
        {!isNew ? <Btn tone="danger" onClick={async () => { if (!window.confirm(`Delete brand ${v.name}?`)) return; try { await postForm({ kind: "brand_delete", id: v.id }); onDone(); } catch (x) { setMsg(x instanceof Error ? x.message : "Error"); } }}>Delete</Btn> : null}
        <span className="text-sm text-tt-soft">{msg}</span>
      </div>
    </form>
  );
}

function CategoryRow({ c, isNew, onDone }: { c: Category; isNew?: boolean; onDone: () => void }) {
  const [v, setV] = useState(c);
  const [msg, setMsg] = useState("");
  const set = (k: keyof Category, val: string | number) => setV((cur) => ({ ...cur, [k]: val }));
  return (
    <form
      className="grid gap-3 rounded-3xl p-5 ring-1 ring-tt-line sm:grid-cols-2"
      style={{ background: v.tint }}
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await postForm({ kind: "category_save", id: v.id, name: v.name, blurb: v.blurb, tint: v.tint, ink: v.ink, image: v.image, sort: String(v.sort), hidden: v.hidden ? "1" : "0" });
          setMsg("Saved");
          onDone();
        } catch (x) { setMsg(x instanceof Error ? x.message : "Error"); }
      }}
    >
      <label className="text-sm font-semibold">Category name<input value={v.name} onChange={(e) => set("name", e.target.value)} className={inputCls} /></label>
      <label className="text-sm font-semibold">Short text<input value={v.blurb} onChange={(e) => set("blurb", e.target.value)} className={inputCls} /></label>
      <div className="sm:col-span-2"><MediaField label="Photo" value={v.image} onChange={(x) => set("image", x)} /></div>
      <div className="flex flex-wrap items-end gap-4 text-sm font-semibold sm:col-span-2">
        <label className="flex items-center gap-2">Background <input type="color" value={v.tint} onChange={(e) => set("tint", e.target.value)} className="h-9 w-12 rounded" /></label>
        <label className="flex items-center gap-2">Text colour <input type="color" value={v.ink} onChange={(e) => set("ink", e.target.value)} className="h-9 w-12 rounded" /></label>
        <label className="flex items-center gap-2">Order <input inputMode="numeric" value={v.sort} onChange={(e) => set("sort", Number(e.target.value) || 0)} className="w-16 rounded-xl bg-white px-3 py-2 ring-1 ring-tt-line" /></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!v.hidden} onChange={(e) => set("hidden", e.target.checked ? 1 : 0)} className="h-4 w-4 accent-[#1B8053]" /> Hide</label>
        {!isNew ? <span className="text-xs font-normal text-tt-soft">Link id: {v.id}</span> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Btn type="submit">{isNew ? "Add category" : "Save"}</Btn>
        {!isNew ? <Btn tone="danger" onClick={async () => { if (!window.confirm(`Delete category ${v.name}?`)) return; try { await postForm({ kind: "category_delete", id: v.id }); onDone(); } catch (x) { setMsg(x instanceof Error ? x.message : "Error"); } }}>Delete</Btn> : null}
        <span className="text-sm text-tt-ink/70">{msg}</span>
      </div>
    </form>
  );
}

export function ListsPanel({ brands, categories, onChange }: { brands: Brand[]; categories: Category[]; onChange: () => void }) {
  const [addB, setAddB] = useState(false);
  const [addC, setAddC] = useState(false);
  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <section className="space-y-3">
        <Card className="flex items-center justify-between"><h3 className="tt-display text-xl font-bold">Categories</h3><Btn onClick={() => setAddC(!addC)}>{addC ? "Close" : "+ Add category"}</Btn></Card>
        {addC ? <CategoryRow isNew c={{ id: "", name: "", blurb: "", tint: "#D8F3E3", ink: "#157A52", image: "", sort: categories.length, hidden: 0 }} onDone={() => { setAddC(false); onChange(); }} /> : null}
        {categories.map((c) => <CategoryRow key={c.id + c.image + c.name} c={c} onDone={onChange} />)}
      </section>
      <section className="space-y-3">
        <Card className="flex items-center justify-between"><h3 className="tt-display text-xl font-bold">Brands</h3><Btn onClick={() => setAddB(!addB)}>{addB ? "Close" : "+ Add brand"}</Btn></Card>
        {addB ? <BrandRow isNew b={{ id: "", name: "", origin: "", about: "", logo: "", sort: brands.length, hidden: 0 }} onDone={() => { setAddB(false); onChange(); }} /> : null}
        {brands.map((b) => <BrandRow key={b.id + b.name + (b.logo ?? "")} b={b} onDone={onChange} />)}
      </section>
    </div>
  );
}
