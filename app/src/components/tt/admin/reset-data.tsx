import { useState } from "react";

import { Btn, Card, inputCls, postJson, toast } from "./ui";

const GROUPS = [
  { id: "orders", label: "Orders & sales stats", hint: "Every order in every status. Dashboard, sales reports and order lists go back to zero. Stock levels are not changed." },
  { id: "expenses", label: "Expenses", hint: "All recorded expenses." },
  { id: "stock", label: "Stock history", hint: "The stock movement log. Current stock levels and average costs stay." },
  { id: "inventory", label: "Inventory", hint: "Stock counts and average costs are cleared and stock tracking is switched off on every product. Products stay buyable until you Receive stock again. Also clears the stock history." },
  { id: "customers", label: "Bean Points & customers", hint: "All points history and all customer accounts. Customers need to sign up again." },
] as const;

/** Super Admin only: wipe test data before going live. Needs the word RESET typed to run. */
export function ResetData({ onChange }: { onChange: () => void }) {
  const [pick, setPick] = useState<Record<string, boolean>>({ orders: true, expenses: true, stock: true, inventory: false, customers: true });
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const chosen = GROUPS.filter((g) => pick[g.id]).map((g) => g.id);
  const ready = word.trim() === "RESET" && chosen.length > 0;

  async function run() {
    if (!ready) return;
    setBusy(true);
    try {
      const d = (await postJson({ kind: "data_reset", groups: chosen, confirm: word.trim() })) as unknown as { cleared: Record<string, number> };
      const c = d.cleared ?? {};
      toast(`Cleared: ${Object.entries(c).map(([k, n]) => `${n} ${k}`).join(", ") || "nothing"}.`);
      setWord("");
      onChange();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="ring-[#F3C1CB]">
      <h3 className="tt-display text-xl font-bold text-[#A3283F]">Reset data</h3>
      <p className="mt-1 text-sm text-tt-soft">Clear test data before you go live. This can't be undone. Products, prices, bundles, categories, brands, website text, settings and logins are kept. Inventory is only reset if you tick it.</p>
      <div className="mt-4 space-y-2">
        {GROUPS.map((g) => (
          <label key={g.id} className="flex cursor-pointer items-start gap-3 rounded-2xl bg-tt-milk px-4 py-3 text-sm ring-1 ring-tt-line">
            <input type="checkbox" checked={!!pick[g.id]} onChange={(e) => setPick({ ...pick, [g.id]: e.target.checked })} className="mt-0.5 h-5 w-5 accent-[#A3283F]" />
            <span><b>{g.label}</b><span className="block text-xs text-tt-soft">{g.hint}</span></span>
          </label>
        ))}
      </div>
      <label className="mt-4 block text-xs font-semibold">Type RESET to confirm
        <input value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" placeholder="RESET" className={inputCls} />
      </label>
      <div className="mt-4"><Btn tone="danger" disabled={!ready || busy} onClick={() => void run()}>{busy ? "Clearing..." : "Clear selected data"}</Btn></div>
    </Card>
  );
}
