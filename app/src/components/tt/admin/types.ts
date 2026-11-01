import type { Brand, Bundle, Category, Product, Settings } from "../../../lib/catalog";

export type AdminOrder = {
  id: number; code: string; name: string; phone: string; island: string; address: string; notes: string; payment: string;
  items_json: string; subtotal: number; delivery: number; total: number; slip_key: string | null; status: string; created_at: string;
  customer_id: number | null; admin_note: string; confirmed_at: string | null; notify_log: string;
  delivery_status: string; completed_at: string | null; cogs: number; stock_deducted: number;
  points_used?: number; points_discount?: number; points_earned?: number; source?: string; created_by?: string;
  slip_bank?: string; slip_ref?: string; slip_amount?: number | null; slip_date?: string; slip_checked?: number;
};
export type AdminCustomer = {
  id: number; name: string; phone: string; email: string; island: string; address: string; status: string;
  created_at: string; approved_at: string | null; last_login: string | null; order_count: number; reset_requested_at: string | null; reset_sent_at?: string | null; reset_channel?: string; telegram?: number; avatar?: string; points?: number; created_by?: string; has_login?: number;
};
export type Expense = { id: number; spent_on: string; category: string; description: string; amount: number; created_at: string };
export type StockMove = { id: number; product_id: string; product_name: string | null; change: number; reason: string; note: string; unit_cost: number; logistics?: number; avg_after?: number | null; order_code: string | null; created_at: string };
export type AdminData = {
  orders: AdminOrder[]; customers: AdminCustomer[]; products: Product[]; brands: Brand[]; categories: Category[]; settings: Settings;
  expenses: Expense[]; moves: StockMove[]; bundles: Bundle[];
  role: "super" | "admin" | null; me: AdminUserT; users: AdminUserT[];
};
export type AdminUserT = { id: number; username: string; name: string; role: "super" | "admin"; active: number; created_at: string; created_by: string; last_login: string | null };
export const fmtDate = (s: string | null) => (s ? new Date(s.replace(" ", "T") + "Z").toLocaleString() : "");
export const toDate = (s: string | null) => (s ? new Date(s.replace(" ", "T") + (s.length > 10 ? "Z" : "T00:00:00Z")) : null);
export const monthKey = (s: string | null) => (s ? s.slice(0, 7) : "");
/** Items parsed from an order. */
export function orderItems(o: AdminOrder): { id: string; name: string; qty: number; price: number }[] {
  try { return JSON.parse(o.items_json); } catch { return []; }
}
/** Revenue is booked when an order is completed (goods delivered). */
export const revenueDate = (o: AdminOrder) => o.completed_at || o.confirmed_at || o.created_at;
