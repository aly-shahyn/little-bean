import { createFileRoute } from "@tanstack/react-router";

import { isAdmin, json } from "../../../lib/admin.server";
import { bindings } from "../../../lib/bindings.server";
import { slugify } from "../../../lib/catalog";

const IMG = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const VID = ["video/mp4", "video/webm", "video/quicktime"];
const isGlb = (f: File) => f.name.toLowerCase().endsWith(".glb") || f.type === "model/gltf-binary";

async function store(file: File, folder: string, allowVideo = false): Promise<string> {
  const { STORAGE } = bindings();
  if (!STORAGE) throw new Error("File storage is not available.");
  const glb = allowVideo && isGlb(file);
  const okType = glb || IMG.includes(file.type) || (allowVideo && VID.includes(file.type));
  if (!okType) throw new Error(allowVideo ? "Use a JPG, PNG, WebP image, an MP4 video or a GLB 3D model." : "Use a JPG, PNG or WebP image.");
  const max = glb ? 40 : VID.includes(file.type) ? 60 : 8;
  if (file.size > max * 1024 * 1024) throw new Error(`File too large (max ${max} MB).`);
  const ext = glb ? "glb" : file.type === "video/quicktime" ? "mov" : file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
  const key = `${folder}/${crypto.randomUUID().slice(0, 12)}.${ext}`;
  await STORAGE.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: glb ? "model/gltf-binary" : file.type } });
  return `/media/${key}`;
}

const s = (f: FormData, k: string, max = 4000) => String(f.get(k) ?? "").trim().slice(0, max);
const n = (f: FormData, k: string) => Math.max(0, Math.min(1000000, Math.floor(Number(f.get(k)) || 0)));
const flag = (f: FormData, k: string) => (f.get(k) === "1" ? 1 : 0);

async function uniqueId(table: "products" | "brands" | "categories", base: string): Promise<string> {
  const { DB } = bindings();
  let id = slugify(base) || "item";
  for (let i = 2; i < 50; i++) {
    const hit = await DB!.prepare(`SELECT id FROM ${table} WHERE id = ?`).bind(id).first();
    if (!hit) return id;
    id = `${slugify(base)}-${i}`;
  }
  return `${slugify(base)}-${crypto.randomUUID().slice(0, 6)}`;
}

export const Route = createFileRoute("/api/admin/catalog")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isAdmin(request))) return json({ ok: false, error: "unauthorized" }, { status: 401 });
        const { DB } = bindings();
        if (!DB) return json({ ok: false, error: "No database." }, { status: 503 });
        const f = await request.formData();
        const kind = s(f, "kind");
        try {
          if (kind === "upload") {
            const file = f.get("file");
            if (!(file instanceof File) || !file.size) return json({ ok: false, error: "No file." }, { status: 400 });
            return json({ ok: true, url: await store(file, "content", true) });
          }

          if (kind === "product_save") {
            const name = s(f, "name", 160);
            if (!name) return json({ ok: false, error: "Product name is required." }, { status: 400 });
            let id = s(f, "id", 120);
            const isNew = !id;
            if (isNew) id = await uniqueId("products", name);
            let image = s(f, "image", 500) || "/assets/samples/snacks.jpg";
            const photo = f.get("photo");
            if (photo instanceof File && photo.size > 0) image = await store(photo, "products");
            const vals = [
              name, s(f, "brand", 80), s(f, "category", 80), s(f, "age", 20), n(f, "price"), s(f, "weight", 40), image,
              s(f, "short", 300), s(f, "description"), s(f, "ingredients"), s(f, "highlights"), s(f, "allergy", 500), s(f, "serve", 1000),
              flag(f, "in_stock"), flag(f, "featured"), n(f, "sort"), flag(f, "hidden"),
            ];
            if (isNew) {
              await DB.prepare(
                "INSERT INTO products (name, brand, category, age, price, weight, image, short, description, ingredients, highlights, allergy, serve, in_stock, featured, sort, hidden, price_confirmed, id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)",
              ).bind(...vals, id).run();
            } else {
              await DB.prepare(
                "UPDATE products SET name=?, brand=?, category=?, age=?, price=?, weight=?, image=?, short=?, description=?, ingredients=?, highlights=?, allergy=?, serve=?, in_stock=?, featured=?, sort=?, hidden=?, price_confirmed=1, updated_at=datetime('now') WHERE id=?",
              ).bind(...vals, id).run();
            }
            return json({ ok: true, id, image });
          }

          if (kind === "product_delete") {
            await DB.prepare("DELETE FROM products WHERE id = ?").bind(s(f, "id")).run();
            return json({ ok: true });
          }

          if (kind === "brand_save") {
            const name = s(f, "name", 120);
            if (!name) return json({ ok: false, error: "Brand name is required." }, { status: 400 });
            const id = s(f, "id") || (await uniqueId("brands", name));
            await DB.prepare(
              "INSERT INTO brands (id, name, origin, about, logo, sort, hidden) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, origin=excluded.origin, about=excluded.about, logo=excluded.logo, sort=excluded.sort, hidden=excluded.hidden",
            ).bind(id, name, s(f, "origin", 80), s(f, "about", 600), s(f, "logo", 500), n(f, "sort"), flag(f, "hidden")).run();
            return json({ ok: true, id });
          }

          if (kind === "category_save") {
            const name = s(f, "name", 120);
            if (!name) return json({ ok: false, error: "Category name is required." }, { status: 400 });
            const id = s(f, "id") || (await uniqueId("categories", name));
            let image = s(f, "image", 500);
            const photo = f.get("photo");
            if (photo instanceof File && photo.size > 0) image = await store(photo, "content");
            const color = (k: string, d: string) => (/^#[0-9a-fA-F]{6}$/.test(s(f, k)) ? s(f, k) : d);
            await DB.prepare(
              "INSERT INTO categories (id, name, blurb, tint, ink, image, sort, hidden) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, blurb=excluded.blurb, tint=excluded.tint, ink=excluded.ink, image=excluded.image, sort=excluded.sort, hidden=excluded.hidden",
            ).bind(id, name, s(f, "blurb", 300), color("tint", "#D8F3E3"), color("ink", "#157A52"), image, n(f, "sort"), flag(f, "hidden")).run();
            return json({ ok: true, id, image });
          }

          if (kind === "brand_delete" || kind === "category_delete") {
            const table = kind === "brand_delete" ? "brands" : "categories";
            const col = kind === "brand_delete" ? "brand" : "category";
            const id = s(f, "id");
            const used = await DB.prepare(`SELECT COUNT(*) AS n FROM products WHERE ${col} = ?`).bind(id).first<{ n: number }>();
            if (used?.n) return json({ ok: false, error: `${used.n} products still use this. Move them first, or hide it instead.` }, { status: 400 });
            await DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
            return json({ ok: true });
          }
        } catch (e) {
          return json({ ok: false, error: e instanceof Error ? e.message : "Save failed." }, { status: 400 });
        }
        return json({ ok: false, error: "Unknown request." }, { status: 400 });
      },
    },
  },
});
