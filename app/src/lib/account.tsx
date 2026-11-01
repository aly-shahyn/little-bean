import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import type { Customer } from "./catalog";

export type MyOrder = {
  code: string; items_json: string; subtotal: number; delivery: number; total: number; status: string; delivery_status: string; payment: string;
  created_at: string; confirmed_at?: string | null; completed_at?: string | null; out_for_delivery_at?: string | null; delivered_at?: string | null; points_used?: number; points_discount?: number; points_earned?: number;
};
export type PointsEntry = { change: number; reason: string; order_code: string | null; note: string; created_at: string };

type AccountCtx = {
  customer: Customer | null;
  orders: MyOrder[];
  loading: boolean;
  saved: string[];
  points: number;
  ledger: PointsEntry[];
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => Promise<"login" | "ok">;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AccountCtx | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<string[]>([]);
  const [points, setPoints] = useState(0);
  const [ledger, setLedger] = useState<PointsEntry[]>([]);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/account/me", { cache: "no-store" });
      const d = (await r.json()) as { customer: Customer | null; orders: MyOrder[]; saved?: string[]; points?: number; ledger?: PointsEntry[] };
      setCustomer(d.customer);
      setOrders(d.orders ?? []);
      setSaved(d.saved ?? []);
      setPoints(d.points ?? 0);
      setLedger(d.ledger ?? []);
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/account/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ logout: true }) });
    setCustomer(null);
    setOrders([]);
    setSaved([]);
  }, []);

  const toggleSaved = useCallback(
    async (id: string): Promise<"login" | "ok"> => {
      if (!customer) return "login";
      const next = !saved.includes(id);
      setSaved((cur) => (next ? [id, ...cur] : cur.filter((x) => x !== id)));
      const r = await fetch("/api/account/saved", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product_id: id, saved: next }) });
      if (!r.ok) setSaved((cur) => (next ? cur.filter((x) => x !== id) : [id, ...cur]));
      return "ok";
    },
    [customer, saved],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <Ctx.Provider value={{ customer, orders, loading, refresh, logout, saved, points, ledger, isSaved: (id) => saved.includes(id), toggleSaved }}>{children}</Ctx.Provider>;
}

export function useAccount(): AccountCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAccount outside AccountProvider");
  return v;
}
