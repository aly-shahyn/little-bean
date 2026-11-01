import { bindings } from "./bindings.server";
import { DEFAULT_BRANDS, DEFAULT_CATEGORIES, type Brand, type Bundle, type Category, type Product, type Settings } from "./catalog";
import { SEED_PRODUCTS } from "./seed-products";

export const PRIVATE_KEYS = ["admin_hash", "admin2_hash", "wa_token", "wa_phone_number_id", "wa_tpl_placed", "wa_tpl_confirmed", "wa_tpl_account", "wa_tpl_admin", "wa_lang", "callmebot_key", "owner_notify_phone", "sms_provider", "sms_twilio_sid", "sms_twilio_token", "sms_twilio_from", "sms_twilio_service", "sms_http_url", "sms_http_method", "sms_http_headers", "sms_http_body", "sms_sender", "telegram_bot_token"];

const DEFAULT_SETTINGS: Settings = {
  whatsapp: "",
  viber: "",
  bank_name: "Bank of Maldives",
  bank_account_name: "",
  bank_account_number: "",
  delivery_fee: "0",
  delivery_note: "We deliver across Male, Hulhumale and Villimale. For other islands, we send by ferry or speedboat. Message us for rates.",
  announcement: "Instant purchase only. No refunds or returns, so please double-check your order.",
  instagram: "tinnytummiesmv",
  require_approval: "1",
  wa_lang: "en",
};

const SEED_COLS =
  "id, name, brand, category, age, price, weight, image, short, description, ingredients, highlights, allergy, serve, in_stock, featured, sort, price_confirmed, hidden";
export const PRODUCT_COLS = `${SEED_COLS}, stock, cost_price, low_stock, sku, batch_no, expiry`;

async function ensureSeeded(): Promise<void> {
  const { DB } = bindings();
  if (!DB) return;
  const counts = await DB.prepare(
    "SELECT (SELECT COUNT(*) FROM products) AS p, (SELECT COUNT(*) FROM brands) AS b, (SELECT COUNT(*) FROM categories) AS c",
  ).first<{ p: number; b: number; c: number }>();
  const batch = [];
  if (!counts?.p) {
    const s = DB.prepare(`INSERT OR IGNORE INTO products (${SEED_COLS}) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`);
    for (const p of SEED_PRODUCTS)
      batch.push(s.bind(p.id, p.name, p.brand, p.category, p.age, p.price, p.weight, p.image, p.short, p.description, p.ingredients, p.highlights, p.allergy, p.serve, p.in_stock, p.featured, p.sort, p.price_confirmed));
  }
  if (!counts?.b) {
    const s = DB.prepare("INSERT OR IGNORE INTO brands (id, name, origin, about, sort, hidden) VALUES (?,?,?,?,?,0)");
    for (const b of DEFAULT_BRANDS) batch.push(s.bind(b.id, b.name, b.origin, b.about, b.sort));
  }
  if (!counts?.c) {
    const s = DB.prepare("INSERT OR IGNORE INTO categories (id, name, blurb, tint, ink, image, sort, hidden) VALUES (?,?,?,?,?,?,?,0)");
    for (const c of DEFAULT_CATEGORIES) batch.push(s.bind(c.id, c.name, c.blurb, c.tint, c.ink, c.image, c.sort));
  }
  if (batch.length) await DB.batch(batch);
}

export async function listProducts(includeHidden = false): Promise<Product[]> {
  const { DB } = bindings();
  if (!DB) return SEED_PRODUCTS;
  await ensureSeeded();
  const res = await DB.prepare(
    `SELECT ${PRODUCT_COLS} FROM products ${includeHidden ? "" : "WHERE hidden = 0"} ORDER BY sort ASC, name ASC`,
  ).all<Product>();
  // A tracked product with no stock left shows as "back soon" automatically.
  return (res.results ?? []).map((p) => ({ ...p, in_stock: p.in_stock && (p.stock === null || p.stock === undefined || p.stock > 0) ? 1 : 0 }));
}

/** Products for the public shop: no cost prices. */
export async function listPublicProducts(): Promise<Product[]> {
  return (await listProducts()).map(({ cost_price: _c, ...p }) => p);
}

export async function listBrands(includeHidden = false): Promise<Brand[]> {
  const { DB } = bindings();
  if (!DB) return DEFAULT_BRANDS;
  await ensureSeeded();
  const res = await DB.prepare(`SELECT * FROM brands ${includeHidden ? "" : "WHERE hidden = 0"} ORDER BY sort ASC, name ASC`).all<Brand>();
  return res.results ?? [];
}

export async function listCategories(includeHidden = false): Promise<Category[]> {
  const { DB } = bindings();
  if (!DB) return DEFAULT_CATEGORIES;
  await ensureSeeded();
  const res = await DB.prepare(`SELECT * FROM categories ${includeHidden ? "" : "WHERE hidden = 0"} ORDER BY sort ASC, name ASC`).all<Category>();
  return res.results ?? [];
}

export async function readSettings(): Promise<Settings> {
  const { DB } = bindings();
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (!DB) return out;
  const res = await DB.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>();
  for (const r of res.results ?? []) out[r.key] = r.value;
  return out;
}

export async function publicSettings(): Promise<Settings> {
  const all = await readSettings();
  const out: Settings = {};
  for (const [k, v] of Object.entries(all)) if (!PRIVATE_KEYS.includes(k)) out[k] = v;
  return out;
}

export async function listBundles(all = false): Promise<Bundle[]> {
  const { DB } = bindings();
  if (!DB) return [];
  try {
    const r = await DB.prepare(`SELECT id, name, blurb, image, items_json, price, kind, age, active, sort FROM bundles ${all ? "" : "WHERE active = 1"} ORDER BY sort, created_at`).all<Bundle>();
    return r.results ?? [];
  } catch {
    return [];
  }
}

/** Products most often bought together, from recent orders: { productId: [otherId, ...] } */
export async function frequentlyBought(): Promise<Record<string, string[]>> {
  const { DB } = bindings();
  if (!DB) return {};
  try {
    const r = await DB.prepare("SELECT items_json FROM orders WHERE status IN ('pending','confirmed','completed') ORDER BY id DESC LIMIT 400").all<{ items_json: string }>();
    const pair = new Map<string, Map<string, number>>();
    for (const row of r.results ?? []) {
      let items: { id: string; bundle_items?: { id: string }[] }[] = [];
      try { items = JSON.parse(row.items_json); } catch { continue; }
      const ids = [...new Set(items.flatMap((i) => (i.bundle_items?.length ? i.bundle_items.map((b) => b.id) : [i.id])))];
      for (const a of ids) for (const b of ids) {
        if (a === b) continue;
        const m = pair.get(a) ?? new Map<string, number>();
        m.set(b, (m.get(b) ?? 0) + 1);
        pair.set(a, m);
      }
    }
    const out: Record<string, string[]> = {};
    for (const [a, m] of pair) out[a] = [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([id]) => id);
    return out;
  } catch {
    return {};
  }
}
