import type { D1Database } from "@cloudflare/workers-types";

import { BUNDLE_PREFIX, bundleItems, pointsRules, type PlacedOrder, type Settings } from "./catalog";
import { listBundles, listProducts } from "./shop.server";

/**
 * Shared by the website checkout and the admin "New order" screen, so both price, check stock
 * and spend Bean Points in exactly the same way.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function orderCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "TT-" + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export type PricedCart = { items: PlacedOrder["items"]; subtotal: number; unavailable: string[]; error?: string };

/** Turns [{id, qty}] into priced order lines from the live catalogue, with the same stock rules as checkout. */
export async function priceCart(raw: unknown): Promise<PricedCart> {
  const wanted = Array.isArray(raw) ? raw : [];
  const [products, bundles] = await Promise.all([listProducts(), listBundles()]);
  const items: PlacedOrder["items"] = [];
  const unavailable: string[] = [];
  const need = new Map<string, number>(); // product id -> units, for stock checks
  for (const w of wanted.slice(0, 60)) {
    const id = typeof w?.id === "string" ? w.id : "";
    const qty = Math.max(1, Math.min(50, Math.floor(Number(w?.qty) || 0)));
    if (id.startsWith(BUNDLE_PREFIX)) {
      const b = bundles.find((x) => x.id === id.slice(BUNDLE_PREFIX.length));
      if (!b) { unavailable.push("a bundle"); continue; }
      const parts = bundleItems(b).map((bi) => ({ ...bi, p: products.find((x) => x.id === bi.id) }));
      if (parts.find((x) => !x.p || !x.p.in_stock)) return { items, subtotal: 0, unavailable, error: `Sorry, the ${b.name} bundle is not available right now.` };
      for (const x of parts) need.set(x.id, (need.get(x.id) ?? 0) + x.qty * qty);
      items.push({ id, name: b.name, price: b.price, qty, image: b.image, bundle_items: parts.map((x) => ({ id: x.id, qty: x.qty, name: x.p!.name })) });
      continue;
    }
    const p = products.find((x) => x.id === id);
    if (p && p.in_stock) {
      need.set(p.id, (need.get(p.id) ?? 0) + qty);
      items.push({ id: p.id, name: p.name, price: p.price, qty, batch_no: p.batch_no || undefined, expiry: p.expiry || undefined });
    } else unavailable.push(p?.name ?? id);
  }
  for (const [pid, units] of need) {
    const p = products.find((x) => x.id === pid);
    if (p && p.stock !== null && p.stock !== undefined && units > p.stock)
      return { items, subtotal: 0, unavailable, error: `Sorry, only ${p.stock} left of ${p.name}. Please lower the quantity.` };
  }
  return { items, subtotal: items.reduce((s, i) => s + i.price * i.qty, 0), unavailable };
}

/** Bean Points: spend the balance against the products (never below zero). */
export async function pointsToUse(DB: D1Database, settings: Settings, customerId: number, subtotal: number) {
  const rules = pointsRules(settings);
  const bal = (await DB.prepare("SELECT COALESCE(SUM(change), 0) AS b FROM points_ledger WHERE customer_id = ?").bind(customerId).first<{ b: number }>())?.b ?? 0;
  const usable = Math.min(bal, Math.floor(subtotal / rules.value));
  if (usable < rules.min) return { used: 0, discount: 0 };
  const discount = rules.worth(usable);
  return { used: Math.ceil(discount / rules.value), discount };
}
