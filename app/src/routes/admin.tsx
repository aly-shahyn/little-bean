import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { adminPost } from "../lib/admin-api";
import { useCallback, useEffect, useState } from "react";

import { Logo } from "../components/tt/logo";
import { IconClose, IconMenu } from "../components/tt/icons";
import { OrdersPanel } from "../components/tt/admin/orders";
import { NewOrderPanel } from "../components/tt/admin/new-order";
import { CustomersPanel } from "../components/tt/admin/customers";
import { ProductsPanel } from "../components/tt/admin/products";
import { ListsPanel } from "../components/tt/admin/lists";
import { ContentPanel } from "../components/tt/admin/content";
import { SettingsPanel } from "../components/tt/admin/settings";
import { Dashboard, type Section } from "../components/tt/admin/dashboard";
import { InventoryPanel, stockLevel } from "../components/tt/admin/inventory";
import { ExpensesPanel, SalesPanel } from "../components/tt/admin/money";
import { BundlesPanel } from "../components/tt/admin/bundles";
import { SmsSettings } from "../components/tt/admin/sms-settings";
import { TelegramSettings } from "../components/tt/admin/telegram-settings";
import { LoginScreen, PasswordCard, SetupScreen } from "../components/tt/admin/auth-screens";
import { TeamPanel } from "../components/tt/admin/team";
import { ResetData } from "../components/tt/admin/reset-data";
import { Toaster } from "../components/tt/admin/ui";
import type { AdminData } from "../components/tt/admin/types";

const SECTIONS: Section[] = ["dashboard", "new_order", "pending", "confirmed", "completed", "cancelled", "customers", "products", "inventory", "bundles", "lists", "sales", "expenses", "content", "settings", "team"];

export const Route = createFileRoute("/admin")({
  validateSearch: (s: Record<string, unknown>): { tab?: Section } => ({
    tab: SECTIONS.includes(s.tab as Section) ? (s.tab as Section) : undefined,
  }),
  head: () => ({ meta: [{ title: "Admin | Little Bean" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: Admin,
});

const TITLES: Record<Section, string> = {
  dashboard: "Dashboard",
  new_order: "New order",
  pending: "To confirm",
  confirmed: "Confirmed & delivery",
  completed: "Completed",
  cancelled: "Cancelled",
  customers: "Customers",
  products: "Products",
  inventory: "Inventory",
  bundles: "Bundles & deals",
  lists: "Categories & brands",
  sales: "Sales & reports",
  expenses: "Expenses",
  content: "Website text & photos",
  settings: "Settings",
  team: "Logins & roles",
};

const SUBTITLES: Record<Section, string> = {
  dashboard: "Your shop at a glance.",
  new_order: "Add orders that come in by phone, Viber or in the shop. They follow the same journey as website orders.",
  pending: "New orders land here. Confirm to take the items out of stock and tell the customer.",
  confirmed: "Move each order through Preparing, Out for delivery and Delivered, then complete and close it.",
  completed: "Delivered and closed orders. These count as revenue.",
  cancelled: "Orders you declined or cancelled. Stock was returned.",
  customers: "Approve new sign-ups before they can order.",
  products: "Add, edit, hide or remove products, prices and photos.",
  bundles: "Bundles and super saver deals shown across the shop.",
  inventory: "Stock levels, cost prices, deliveries from suppliers and adjustments.",
  lists: "Shop categories and brands.",
  sales: "Revenue, profit and best sellers.",
  expenses: "Record what the shop spends.",
  content: "Every text and photo on the website.",
  team: "Create logins for your team and choose what each person can do.",
  settings: "Contact, payment, delivery, WhatsApp and password.",
};

function Admin() {
  const router = useRouter();
  const navigate = useNavigate({ from: "/admin" });
  const tab: Section = Route.useSearch().tab ?? "dashboard";
  const [state, setState] = useState<"loading" | "login" | "unconfigured" | "ready" | "offline">("loading");
  const [data, setData] = useState<AdminData | null>(null);
  const [menu, setMenu] = useState(false);

  const load = useCallback(async () => {
    // A hiccup from the host (busy, deploying, security check) must never look like "no owner login yet",
    // so only the shop's own "not_configured" answer opens the first-time setup screen.
    const hiccup = () => setState((s) => (s === "ready" ? s : "offline"));
    try {
      const r = await fetch("/api/admin/data", { cache: "no-store" });
      const d = (r.headers.get("content-type") || "").includes("application/json") ? ((await r.json().catch(() => null)) as (AdminData & { ok?: boolean; error?: string }) | null) : null;
      if (r.status === 401 && d) return setState("login");
      if (r.status === 503 && d?.error === "not_configured") return setState("unconfigured");
      if (!r.ok || !d || d.ok === false) return hiccup();
      setData(d);
      setState("ready");
    } catch {
      hiccup();
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (state !== "offline") return;
    const id = setTimeout(() => void load(), 8000);
    return () => clearTimeout(id);
  }, [state, load]);
  useEffect(() => {
    if (state !== "ready") return;
    const id = setInterval(() => void load(), 60000);
    return () => clearInterval(id);
  }, [state, load]);

  const refresh = async () => {
    await load();
    void router.invalidate();
  };
  const go = (s: Section) => {
    setMenu(false);
    void navigate({ search: { tab: s }, replace: false });
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  if (state === "loading") return <div className="grid min-h-dvh place-items-center bg-[#EEF6EE] text-tt-soft">Loading...</div>;
  if (state === "offline")
    return (
      <div className="grid min-h-dvh place-items-center bg-[#EEF6EE] px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-tt-ink">The back office couldn't load just now.</p>
          <p className="mt-1 text-sm text-tt-soft">The server is busy or updating. Trying again in a few seconds...</p>
          <button type="button" onClick={() => { setState("loading"); void load(); }} className="mt-4 rounded-full bg-tt-ink px-5 py-2.5 text-sm font-semibold text-white">Try now</button>
        </div>
      </div>
    );
  if (state === "unconfigured") return <SetupScreen onDone={() => void load()} />;
  if (state === "login") return <LoginScreen onDone={() => void load()} />;

  const d = data!;
  const badge: Partial<Record<Section, number>> = {
    pending: d.orders.filter((o) => o.status === "pending").length,
    confirmed: d.orders.filter((o) => o.status === "confirmed").length,
    inventory: d.products.filter((p) => ["out", "low"].includes(stockLevel(p))).length,
    customers: d.customers.filter((c) => c.status === "pending").length,
  };
  const groups: { title: string; items: Section[] }[] = [
    { title: "", items: ["dashboard"] },
    { title: "Orders", items: ["new_order", "pending", "confirmed", "completed", "cancelled"] },
    { title: "People", items: ["customers"] },
    { title: "Shop", items: ["products", "inventory", "bundles", "lists"] },
    { title: "Money", items: ["sales", "expenses"] },
    { title: "Website", items: d.role === "super" ? ["content", "settings", "team"] : ["content", "settings"] },
  ];

  const nav = (
    <nav className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g.title || "top"}>
          {g.title ? <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">{g.title}</p> : null}
          <ul className="space-y-0.5">
            {g.items.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => go(s)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14.5px] font-medium transition-colors ${tab === s ? "bg-white text-tt-ink" : "text-white/85 hover:bg-white/10"}`}
                >
                  {TITLES[s]}
                  {badge[s] ? <span className="rounded-full bg-tt-coral px-2 py-0.5 text-xs font-bold text-white">{badge[s]}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const sidebarFooter = (
    <div className="mt-auto space-y-2 border-t border-white/10 pt-4">
      <p className="flex items-center gap-2 px-3 pb-1 text-[13px] text-white/70">
        <span className="min-w-0 truncate">{d.me?.name || d.me?.username}</span>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${d.role === "super" ? "bg-tt-butter text-[#7A5A0E]" : "bg-white/15 text-white"}`}>{d.role === "super" ? "Super Admin" : "Admin"}</span>
      </p>
      <a href="/" target="_blank" rel="noreferrer" className="block rounded-xl px-3 py-2.5 text-[14px] font-medium text-white/85 hover:bg-white/10">View website ↗</a>
      <button
        type="button"
        onClick={async () => { await adminPost("/api/admin/session", { logout: true }); setState("login"); }}
        className="block w-full rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-white/85 hover:bg-white/10"
      >
        Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-dvh bg-[#EEF6EE] lg:pl-[260px]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col overflow-y-auto bg-tt-forest p-5 lg:flex">
        <div className="mb-7 flex items-center gap-2 rounded-2xl bg-tt-milk px-3 py-2.5"><Logo /></div>
        {nav}
        {sidebarFooter}
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-tt-line bg-[#EEF6EE]/95 px-4 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setMenu(true)} className="grid h-10 w-10 place-items-center rounded-full bg-white" aria-label="Open admin menu"><IconMenu /></button>
        <span className="tt-display text-lg font-bold">{TITLES[tab]}</span>
        {badge.pending ? <button type="button" onClick={() => go("pending")} className="ml-auto rounded-full bg-tt-coral px-3 py-1 text-xs font-bold text-white">{badge.pending} new</button> : null}
      </header>
      <div className={`fixed inset-0 z-50 bg-tt-ink/40 transition-opacity lg:hidden ${menu ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setMenu(false)} />
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col overflow-y-auto bg-tt-forest p-5 transition-transform duration-300 lg:hidden ${menu ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-6 flex items-center justify-between">
          <div className="rounded-2xl bg-tt-milk px-3 py-2"><Logo /></div>
          <button type="button" onClick={() => setMenu(false)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white" aria-label="Close menu"><IconClose /></button>
        </div>
        {nav}
        {sidebarFooter}
      </aside>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="mb-6 hidden lg:block">
          <h1 className="tt-display text-4xl font-extrabold">{TITLES[tab]}</h1>
          <p className="mt-1 text-tt-soft">{SUBTITLES[tab]}</p>
        </div>
        <p className="mb-5 text-sm text-tt-soft lg:hidden">{SUBTITLES[tab]}</p>

        {tab === "dashboard" ? <Dashboard d={d} go={go} /> : null}
        {tab === "new_order" ? <NewOrderPanel d={d} onCreated={async (t) => { await refresh(); go(t); }} /> : null}
        {tab === "pending" || tab === "confirmed" || tab === "completed" || tab === "cancelled" ? <OrdersPanel key={tab} view={tab} orders={d.orders} settings={d.settings} onChange={refresh} canDelete={d.role === "super"} /> : null}
        {tab === "customers" ? <CustomersPanel customers={d.customers} settings={d.settings} onChange={refresh} /> : null}
        {tab === "products" ? <ProductsPanel products={d.products} brands={d.brands} categories={d.categories} onChange={refresh} /> : null}
        {tab === "inventory" ? <InventoryPanel products={d.products} moves={d.moves ?? []} onChange={refresh} /> : null}
        {tab === "team" && d.role === "super" ? <TeamPanel users={d.users ?? []} me={d.me} onChange={refresh} /> : null}
        {tab === "bundles" ? <BundlesPanel bundles={d.bundles ?? []} products={d.products} onChange={refresh} /> : null}
        {tab === "sales" ? <SalesPanel d={d} /> : null}
        {tab === "expenses" ? <ExpensesPanel expenses={d.expenses ?? []} onChange={refresh} /> : null}
        {tab === "lists" ? <ListsPanel brands={d.brands} categories={d.categories} onChange={refresh} /> : null}
        {tab === "content" ? <ContentPanel settings={d.settings} products={d.products} onChange={refresh} /> : null}
        {tab === "settings" ? (
          <div className="space-y-5">
            <SettingsPanel settings={d.settings} onChange={refresh} />
            <TelegramSettings settings={d.settings} onChange={refresh} />
            <SmsSettings settings={d.settings} onChange={refresh} />
            <PasswordCard label={d.me ? `@${d.me.username}` : ""} />
            {d.role === "super" ? <ResetData onChange={refresh} /> : null}
          </div>
        ) : null}
      </main>
      <Toaster />
    </div>
  );
}
