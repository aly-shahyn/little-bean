// Shared (client + server) shop types and helpers.
export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  age: string;
  price: number;
  weight: string;
  image: string;
  short: string;
  description: string;
  ingredients: string;
  highlights: string;
  allergy: string;
  serve: string;
  in_stock: number;
  featured: number;
  sort: number;
  price_confirmed: number;
  hidden?: number;
  stock?: number | null;
  cost_price?: number;
  low_stock?: number;
  sku?: string;
  batch_no?: string;
  expiry?: string;
};

export type Brand = { id: string; name: string; origin: string; about: string; sort: number; hidden: number; logo?: string };
export type Category = { id: string; name: string; blurb: string; tint: string; ink: string; image: string; sort: number; hidden: number };
export type Settings = Record<string, string>;
export type Customer = { id: number; name: string; phone: string; email: string; island: string; address: string; status: string; created_at?: string; avatar?: string; baby_name?: string; baby_birth?: string; baby_gender?: string };

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "porridge", name: "Porridge & Cereal", blurb: "Smooth first foods, ready in moments", tint: "#FFD6C7", ink: "#8A3B22", image: "/assets/samples/porridge.jpg", sort: 0, hidden: 0 },
  { id: "oats", name: "Oats", blurb: "Wholesome breakfasts for the whole family", tint: "#FFE9A8", ink: "#7A5A0E", image: "/assets/samples/oats.jpg", sort: 1, hidden: 0 },
  { id: "snacks", name: "Puffs & Sticks", blurb: "Melt-in-the-mouth snacks for little hands", tint: "#D8F3E3", ink: "#157A52", image: "/assets/samples/snacks.jpg", sort: 2, hidden: 0 },
  { id: "pasta", name: "Pasta & Noodles", blurb: "Toddler meals cooked in 7 minutes", tint: "#FFDDE6", ink: "#8C2F45", image: "/assets/samples/pasta.jpg", sort: 3, hidden: 0 },
  { id: "pouches", name: "Fruit & Yoghurt Pouches", blurb: "Organic goodness on the go", tint: "#E7E0FF", ink: "#4D3A86", image: "/assets/samples/pouches.jpg", sort: 4, hidden: 0 },
];

export const DEFAULT_BRANDS: Brand[] = [
  { id: "double-happiness", name: "Double Happiness", origin: "Malaysia", about: "Natural baby foods with a no-junk promise: porridge, rice puffs, rice sticks and quick-cook veggie pasta.", sort: 0, hidden: 0 },
  { id: "little-freddie", name: "Little Freddie", origin: "United Kingdom", about: "Award-winning organic pouches, created in 2014 by two food-loving parents and named after their son.", sort: 1, hidden: 0 },
  { id: "pure-eat", name: "Pure-Eat", origin: "South Korea", about: "Clean organic snacks. The famous Looong Stick is made to be held and nibbled by tiny hands.", sort: 2, hidden: 0 },
  { id: "mennosato", name: "Mennosato", origin: "Malaysia", about: "Certified organic baby noodles with real vegetables and nothing artificial.", sort: 3, hidden: 0 },
  { id: "bms-organics", name: "BMS Organics", origin: "Malaysia", about: "Trusted organic pantry staples, including baby-sized rolled oats.", sort: 4, hidden: 0 },
  { id: "country-farm", name: "Country Farm Organics", origin: "Malaysia", about: "Organic pioneers since 1998, bringing certified organic oats from Finland.", sort: 5, hidden: 0 },
  { id: "organic-wave", name: "Organic Wave", origin: "Finland", about: "Simple organic oats with nothing added. Original taste, no additives.", sort: 6, hidden: 0 },
];

export const AGES = [
  { id: "6m+", key: "age6", label: "6 months+", tint: "#FFD6C7" },
  { id: "7m+", key: "age7", label: "7 months+", tint: "#D8F3E3" },
  { id: "9m+", key: "age9", label: "9 months+", tint: "#E7E0FF" },
  { id: "12m+", key: "age12", label: "12 months+", tint: "#FFDDE6" },
] as const;

export const AGE_OPTIONS = ["6m+", "7m+", "9m+", "12m+", "Family"];

export const ORDER_STATUSES = [
  { id: "pending", label: "Waiting for confirmation", tint: "#FFD6C7" },
  { id: "confirmed", label: "Confirmed", tint: "#D8F3E3" },
  { id: "completed", label: "Completed", tint: "#CDEBFF" },
  { id: "cancelled", label: "Cancelled", tint: "#EEEEEE" },
] as const;

export const DELIVERY_STEPS = [
  { id: "preparing", label: "Preparing" },
  { id: "out_for_delivery", label: "Out for delivery" },
  { id: "delivered", label: "Delivered" },
] as const;

export const EXPENSE_CATEGORIES = ["Stock purchase", "Delivery", "Packaging", "Marketing", "Rent", "Salaries", "Utilities", "Other"];

/** Customer-facing 3-step view of an order. */
export function customerStep(status: string, delivery: string): { step: number; label: string } {
  if (status === "cancelled") return { step: -1, label: "Cancelled" };
  if (status === "completed") return { step: 2, label: "Delivered" };
  if (status === "confirmed") return delivery === "delivered" ? { step: 2, label: "Delivered" } : { step: 1, label: delivery === "out_for_delivery" ? "On the way" : "Confirmed" };
  return { step: 0, label: "Placed" };
}

export function statusOf(id: string) {
  return ORDER_STATUSES.find((s) => s.id === id) ?? { id, label: id, tint: "#EEE" };
}

export function lines(s: string | null | undefined): string[] {
  return (s ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
}
export function mvr(n: number) {
  return `MVR ${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
/** Digits only; 7-digit Maldivian numbers get the 960 country code. */
export function normalizePhone(s: string): string {
  const d = (s || "").replace(/[^0-9]/g, "");
  if (d.length === 7) return `960${d}`;
  return d;
}
export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export type PlacedOrder = {
  code: string; name: string; phone: string; island: string; address: string; notes: string; payment: string;
  items: OrderItem[]; subtotal: number; delivery: number; total: number; slip: boolean; status?: string; points_used?: number; points_discount?: number;
};
export type OrderItem = { id: string; name: string; price: number; qty: number; batch_no?: string; expiry?: string; image?: string; bundle_items?: { id: string; qty: number; name?: string }[] };

const PAY_LABEL: Record<string, string> = { whatsapp: "WhatsApp", viber: "Viber", bml: "BML bank transfer", cash: "Cash", card: "Card" };

export function orderSummary(o: PlacedOrder): string {
  return [
    ...o.items.map((i) => `- ${i.qty} x ${i.name} (${mvr(i.price * i.qty)})`),
    o.points_discount ? `Bean Points: -${mvr(o.points_discount)}` : "",
    o.delivery ? `Delivery: ${mvr(o.delivery)}` : "",
    `Total: ${mvr(o.total)}`,
  ].filter(Boolean).join("\n");
}

/** Customer to shop: new order message. */
export function orderMessage(o: PlacedOrder): string {
  return [
    `Hi Little Bean! New order ${o.code}`,
    "",
    orderSummary(o),
    "",
    `Name: ${o.name}`,
    `Phone: ${o.phone}`,
    `Address: ${o.address}${o.island ? `, ${o.island}` : ""}`,
    `Payment: ${PAY_LABEL[o.payment] ?? o.payment}`,
    o.notes ? `Notes: ${o.notes}` : "",
  ].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}

/** Shop to customer messages. */
export function placedMessageForCustomer(o: PlacedOrder): string {
  return `Hi ${o.name.split(" ")[0]}, thank you for your order ${o.code} at Little Bean!\n\n${orderSummary(o)}\n\nWe'll review it and confirm shortly.`;
}
export function confirmedMessageForCustomer(o: PlacedOrder, s: Settings): string {
  const bank = o.payment === "bml" && s.bank_account_number
    ? `\n\nPlease transfer ${mvr(o.total)} to ${s.bank_name || "BML"}, ${s.bank_account_name}, account ${s.bank_account_number}, reference ${o.code}.`
    : "";
  return `Hi ${o.name.split(" ")[0]}, your Little Bean order ${o.code} is confirmed!\n\n${orderSummary(o)}${bank}\n\nWe'll be in touch about delivery. Thank you!`;
}
export function approvedMessageForCustomer(name: string): string {
  return `Hi ${name.split(" ")[0]}, your Little Bean account is approved. You can now log in and place orders. Happy shopping!`;
}

/** A bundle or super saver deal: several products for one price. */
export type Bundle = { id: string; name: string; blurb: string; image: string; items_json: string; price: number; kind: string; age: string; active: number; sort: number };
export type BundleItem = { id: string; qty: number };
export function bundleItems(b: Pick<Bundle, "items_json">): BundleItem[] {
  try {
    const v = JSON.parse(b.items_json);
    return Array.isArray(v) ? v.filter((x) => x && typeof x.id === "string").map((x) => ({ id: x.id, qty: Math.max(1, Math.floor(Number(x.qty) || 1)) })) : [];
  } catch {
    return [];
  }
}
export const BUNDLE_PREFIX = "bundle:";

/** Bean Points rules, read from settings. */
export function pointsRules(s: Settings) {
  const perMvr = Math.max(1, Number(s.points_per_mvr) || 10);
  const value = Math.max(0.01, Number(s.point_value) || 0.5);
  const min = Math.max(1, Math.floor(Number(s.points_min_redeem) || 20));
  return { perMvr, value, min, earnFor: (amount: number) => Math.floor(Math.max(0, amount) / perMvr), worth: (pts: number) => Math.floor(pts * value) };
}

/** "2027-03" or "2027-03-14" -> "Mar 2027" */
export function fmtExpiry(e?: string) {
  if (!e || !/^\d{4}-\d{2}/.test(e)) return "";
  const [y, m] = e.split("-").map(Number);
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1] ?? ""} ${y}`;
}

export const PAYMENT_LABELS: Record<string, string> = { bml: "BML transfer", cash: "Cash", card: "Card", whatsapp: "WhatsApp", viber: "Viber" };
export const paymentLabel = (p: string) => PAYMENT_LABELS[p] ?? p;
