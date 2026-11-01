import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { fmtExpiry, mvr, normalizePhone, orderMessage, pointsRules, type PlacedOrder, type Settings } from "../lib/catalog";
import { useAccount } from "../lib/account";
import { useShop } from "../lib/use-shop";
import { useCart } from "../lib/cart";
import { checkSlip, shopAccounts, type SlipResult } from "../lib/slip";
import { preloadSlipReader, readSlipImage } from "../lib/slip-ocr";
import { IconBank, IconChat, IconCheck, IconLock, IconUpload } from "../components/tt/icons";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout | Little Bean" }, { name: "robots", content: "noindex" }] }),
  component: Checkout,
});

type Placed = PlacedOrder;

function BankCard({ s }: { s: Settings }) {
  if (!s.bank_account_number) {
    return <p className="text-sm text-tt-soft">We'll send our BML account details as soon as we confirm your order.</p>;
  }
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14.5px]">
      <dt className="text-tt-soft">Bank</dt><dd className="font-semibold">{s.bank_name}</dd>
      <dt className="text-tt-soft">Account name</dt><dd className="min-w-0 break-words font-semibold">{s.bank_account_name}</dd>
      <dt className="text-tt-soft">Account no.</dt><dd className="min-w-0 break-all font-mono text-[15px] font-bold tracking-wide">{s.bank_account_number}</dd>
    </dl>
  );
}

function Checkout() {
  const { settings, products } = useShop();
  const { customer, loading, refresh, points } = useAccount();
  const [usePoints, setUsePoints] = useState(false);
  const { lines, subtotal, clear } = useCart();
  const payment = "bml"; // Online orders are paid by BML bank transfer.
  const [slip, setSlip] = useState<File | null>(null);
  const [slipRead, setSlipRead] = useState<SlipResult | null>(null);
  const [slipState, setSlipState] = useState<"idle" | "reading" | "done" | "error">("idle");
  const [slipMsg, setSlipMsg] = useState("");
  const [slipUrl, setSlipUrl] = useState("");
  const slipRun = useRef(0);
  const checkOn = settings.slip_check !== "0";
  const canOrder = !!customer && customer.status === "approved" && lines.length > 0;
  // Start loading the slip reader in the background so checking is quick once a slip is chosen.
  useEffect(() => {
    if (!checkOn || !canOrder) return;
    const id = window.setTimeout(() => void preloadSlipReader().catch(() => undefined), 800);
    return () => window.clearTimeout(id);
  }, [checkOn, canOrder]);
  useEffect(() => () => { if (slipUrl) URL.revokeObjectURL(slipUrl); }, [slipUrl]);

  async function onSlip(file: File | null) {
    const run = ++slipRun.current;
    setSlipRead(null); setSlipMsg(""); setSlip(null); setSlipUrl("");
    if (!file) { setSlipState("idle"); return; }
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { setSlipState("error"); setSlipMsg("Please upload the screenshot of your transfer (PNG or JPG)."); return; }
    if (file.size > 8 * 1024 * 1024) { setSlipState("error"); setSlipMsg("This image is too large (max 8 MB)."); return; }
    setSlip(file);
    setSlipUrl(URL.createObjectURL(file));
    if (!checkOn) { setSlipState("done"); return; }
    setSlipState("reading");
    try {
      const { slip: read } = await readSlipImage(file);
      if (run !== slipRun.current) return;
      setSlipRead(read);
      setSlipState("done");
    } catch {
      if (run !== slipRun.current) return;
      setSlipState("error");
      setSlipMsg("We couldn't check this slip right now. Please check your connection and try again.");
    }
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [copied, setCopied] = useState(false);
  const fee = Math.max(0, Number(settings.delivery_fee) || 0);
  const wa = normalizePhone(settings.whatsapp || "");
  const vb = normalizePhone(settings.viber || "");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    form.set("payment", payment);
    form.set("items", JSON.stringify(lines.map((l) => ({ id: l.id, qty: l.qty }))));
    form.set("use_points", usePoints && pointsOff > 0 ? "1" : "0");
    if (slip) form.set("slip", slip);
    else form.delete("slip");
    if (slipRead) {
      form.set("slip_bank", slipRead.bank ?? "");
      form.set("slip_amount", String(slipRead.amount ?? ""));
      form.set("slip_ref", slipRead.reference);
      form.set("slip_date", slipRead.date);
    }
    try {
      const res = await fetch("/api/orders", { method: "POST", body: form });
      const data = (await res.json()) as { ok: boolean; error?: string; order?: Placed; code?: string };
      if (data.code) void refresh();
      if (!data.ok || !data.order) throw new Error(data.error || "Something went wrong. Please try again.");
      setPlaced(data.order);
      clear();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (placed) {
    const msg = orderMessage(placed);
    return (
      <div className="tt-wrap max-w-2xl py-14">
        <div className="tt-rise rounded-[36px] bg-white p-8 text-center ring-1 ring-tt-line sm:p-12">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-tt-sage text-tt-mintdeep"><IconCheck size={38} /></div>
          <h1 className="tt-display mt-5 text-4xl font-extrabold">Thank you, {placed.name.split(" ")[0]}!</h1>
          <p className="mt-2 text-tt-soft">Your order number is</p>
          <p className="tt-display mt-1 text-3xl font-extrabold tracking-wide text-tt-leaf">{placed.code}</p>
          <p className="mt-4 text-[15px] text-tt-ink/80">Total <b>{mvr(placed.total)}</b>{placed.delivery ? "" : " plus delivery, which we'll confirm"}.</p>

          <div className="mt-8 space-y-3 text-left">
            <p className="rounded-2xl bg-tt-butter px-4 py-3 text-center text-sm"><b>Waiting for approval.</b> We'll check your order and send the confirmation to your WhatsApp. You can follow it in <Link to="/account" className="font-semibold underline">My account</Link>.</p>
            <p className="pt-2 text-center text-xs text-tt-soft">Want to reach us faster? Send your order to us directly:</p>
            {wa ? (
              <a href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-[#1FAF5A] font-semibold text-white">
                <IconChat /> Send on WhatsApp
              </a>
            ) : null}
            {vb ? (
              <a href={`viber://chat?number=%2B${vb}`} className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-[#6F4BC8] font-semibold text-white">
                <IconChat /> Open Viber chat
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(msg).then(() => setCopied(true)).catch(() => undefined)}
              className="flex h-12 w-full items-center justify-center rounded-2xl font-semibold ring-1 ring-tt-line"
            >
              {copied ? "Order copied. Paste it into your chat" : "Copy order message"}
            </button>
            {!wa && !vb ? <p className="text-center text-sm text-tt-soft">We've received your order and will call you on {placed.phone} to confirm.</p> : null}
          </div>

          {placed.payment === "bml" ? (
            <div className="mt-8 rounded-3xl bg-tt-butter p-6 text-left">
              <p className="mb-3 flex items-center gap-2 font-semibold"><IconBank size={19} /> Bank transfer details</p>
              <BankCard s={settings} />
              <p className="mt-3 text-sm text-tt-ink/70">Please use <b>{placed.code}</b> as the transfer reference{placed.slip ? ". We have your slip." : " and send us the slip."}</p>
            </div>
          ) : null}
          <Link to="/shop" className="mt-8 inline-block font-semibold text-tt-leaf underline underline-offset-4">Continue shopping</Link>
        </div>
      </div>
    );
  }

  if (loading) return <div className="tt-wrap py-24 text-center text-tt-soft">Loading...</div>;

  if (!customer || customer.status !== "approved") {
    return (
      <div className="tt-wrap max-w-lg py-20 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-tt-peach text-tt-leafdeep"><IconLock size={28} /></div>
        <h1 className="tt-display mt-4 text-4xl font-extrabold">{!customer ? "Log in to order" : "Almost there"}</h1>
        <p className="mt-3 text-tt-soft">
          {!customer
            ? "Please log in or create a free account to place your order. Your basket is saved."
            : customer.status === "pending"
              ? "Your account is waiting for approval. We'll message you on WhatsApp as soon as it's ready, then you can place your order. Your basket is saved."
              : "This account is not active. Please contact us."}
        </p>
        {!customer ? (
          <Link to="/account" search={{ next: "checkout" }} className="mt-7 inline-flex h-14 items-center rounded-full bg-tt-leaf px-8 font-semibold text-white">Log in or sign up</Link>
        ) : (
          <Link to="/shop" className="mt-7 inline-flex h-14 items-center rounded-full px-8 font-semibold ring-1 ring-tt-line">Keep browsing</Link>
        )}
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="tt-wrap py-24 text-center">
        <h1 className="tt-display text-4xl font-extrabold">Your basket is empty</h1>
        <p className="mt-2 text-tt-soft">Add a few goodies, then come back here to order.</p>
        <Link to="/shop" className="mt-6 inline-block rounded-full bg-tt-leaf px-7 py-3.5 font-semibold text-white">Go to the shop</Link>
      </div>
    );
  }

  const rules = pointsRules(settings);
  const usable = Math.min(points, Math.floor(subtotal / rules.value));
  const pointsOff = usable >= rules.min ? rules.worth(usable) : 0;
  const discount = usePoints ? pointsOff : 0;
  const earnNext = rules.earnFor(subtotal - discount);
  const batchOf = (id: string) => products.find((p) => p.id === id);
  const total = subtotal - discount + fee;
  const verdict = slipRead ? checkSlip(slipRead, total, shopAccounts(settings.bank_account_number)) : null;
  const slipOk = !!slip && slipState === "done" && (!checkOn || !!verdict?.ok);

  const field = "mt-1.5 w-full rounded-2xl bg-white px-4 py-3.5 text-[15.5px] outline-none ring-1 ring-tt-line focus:ring-2 focus:ring-tt-leaf";

  return (
    <div className="tt-wrap py-10">
      <h1 className="tt-display tt-rise text-4xl font-extrabold sm:text-5xl">Checkout</h1>
      <form onSubmit={submit} className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 sm:gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6 sm:space-y-8">
          <fieldset className="min-w-0 rounded-[28px] bg-white p-5 ring-1 ring-tt-line sm:rounded-[32px] sm:p-8 [&>legend+*]:clear-both">
            <legend className="tt-display float-left mb-5 w-full text-xl font-bold">Your details</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <p className="text-[15px] sm:col-span-2"><b>{customer.name}</b> · +{customer.phone}</p>
              <label className="text-sm font-semibold">Area
                <select name="island" className={field} defaultValue={customer.island || "Male"}>
                  <option>Male</option><option>Hulhumale</option><option>Villimale</option><option>Other island</option>
                </select>
              </label>
              <label className="text-sm font-semibold sm:col-span-2">Delivery address<input name="address" required defaultValue={customer.address} autoComplete="street-address" placeholder="House name, road, floor" className={field} /></label>
              <label className="text-sm font-semibold sm:col-span-2">Notes (optional)<textarea name="notes" rows={2} placeholder="Best time to deliver, landmarks..." className={field} /></label>
            </div>
            <p className="mt-4 text-sm text-tt-soft">{settings.delivery_note}</p>
          </fieldset>

          <fieldset className="min-w-0 rounded-[28px] bg-white p-5 ring-1 ring-tt-line sm:rounded-[32px] sm:p-8 [&>legend+*]:clear-both">
            <legend className="tt-display float-left mb-5 w-full text-xl font-bold">Payment</legend>
            <div className="flex items-center gap-4 rounded-2xl bg-[#FFE9A8] p-4">
              <IconBank size={22} className="text-[#7A5A0E]" />
              <span>
                <span className="block font-semibold">Pay by BML bank transfer</span>
                <span className="block text-sm text-tt-ink/70">Transfer the total, then upload your slip below</span>
              </span>
            </div>
              <div className="mt-5 space-y-4 rounded-2xl bg-tt-milk p-5">
                <BankCard s={settings} />
                <ol className="space-y-1 text-sm text-tt-ink/80">
                  <li><b>1.</b> Transfer exactly <b>{mvr(total)}</b> to the account above.</li>
                  <li><b>2.</b> Upload the screenshot of the transfer from your BML or MIB app.</li>
                </ol>
                <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed bg-white p-4 text-sm transition-colors hover:border-tt-leaf ${slipOk ? "border-tt-leaf" : slipState === "done" || slipState === "error" ? "border-[#E8A0AE]" : "border-tt-line"}`}>
                  {slipUrl ? <img src={slipUrl} alt="Your transfer slip" className="h-14 w-10 shrink-0 rounded-lg object-cover object-top ring-1 ring-tt-line" /> : <IconUpload size={20} className="shrink-0 text-tt-leaf" />}
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{slip ? "Change slip" : "Upload transfer slip"}</span>
                    <span className={`block text-xs text-tt-soft ${slip ? "truncate" : ""}`}>{slip ? slip.name : "Screenshot (PNG or JPG). Required to place your order."}</span>
                  </span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { void onSlip(e.target.files?.[0] ?? null); e.target.value = ""; }} />
                </label>
                <div aria-live="polite">
                  {slipState === "reading" ? (
                    <p className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold ring-1 ring-tt-line">
                      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-tt-leaf border-t-transparent" aria-hidden="true" /> Checking your slip...
                    </p>
                  ) : null}
                  {slipState === "error" ? <p className="rounded-2xl bg-tt-blush px-4 py-3 text-sm font-semibold text-[#8C2F45]" role="alert">{slipMsg}</p> : null}
                  {slipState === "done" && checkOn && verdict ? (
                    verdict.ok ? (
                      <div className="flex items-start gap-3 rounded-2xl bg-tt-sage px-4 py-3 text-sm text-tt-mintdeep">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-tt-leaf text-white"><IconCheck size={12} /></span>
                        <span><b>Slip verified</b><span className="block text-xs">{verdict.slip.bank} transfer · {mvr(verdict.slip.amount ?? 0)}{verdict.slip.reference ? ` · Ref ${verdict.slip.reference}` : ""}</span></span>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-tt-blush px-4 py-3 text-sm text-[#8C2F45]" role="alert">
                        <b>We couldn't accept this slip</b>
                        <ul className="mt-1 list-disc space-y-0.5 pl-5">{verdict.problems.map((p) => <li key={p}>{p}</li>)}</ul>
                        {wa ? <p className="mt-2 text-xs">Paid but still stuck? <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="font-semibold underline">Message us on WhatsApp</a>.</p> : null}
                      </div>
                    )
                  ) : null}
                </div>
                {checkOn ? <p className="text-xs text-tt-soft">We automatically check the bank, the amount and our account number on your slip. It stays private.</p> : null}
              </div>
          </fieldset>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[28px] bg-white p-5 ring-1 ring-tt-line sm:rounded-[32px] sm:p-8">
            <h2 className="tt-display text-xl font-bold">Order summary</h2>
            <ul className="mt-4 divide-y divide-tt-line">
              {lines.map((l) => (
                <li key={l.id} className="flex items-start gap-3 py-3">
                  <img src={l.image} alt="" className="h-14 w-12 rounded-xl object-cover" />
                  <span className="flex-1 text-[14px] leading-snug">
                    {l.name} <span className="text-tt-soft">x {l.qty}</span>
                    {(l.bundle ?? [{ id: l.id, qty: 1 }]).map((b) => {
                      const p = batchOf(b.id);
                      if (!p || (!p.batch_no && !p.expiry)) return null;
                      return (
                        <span key={b.id} className="mt-1 block text-[11.5px] text-tt-soft">
                          {l.bundle ? `${p.name}: ` : ""}{p.batch_no ? `Batch ${p.batch_no}` : ""}{p.batch_no && p.expiry ? " · " : ""}{p.expiry ? `Best before ${fmtExpiry(p.expiry)}` : ""}
                        </span>
                      );
                    })}
                  </span>
                  <span className="text-sm font-semibold">{mvr(l.price * l.qty)}</span>
                </li>
              ))}
            </ul>
            {points > 0 ? (
              <label className={`mt-4 flex cursor-pointer items-center gap-3 rounded-2xl p-3.5 transition-colors ${pointsOff ? "bg-[#FFF1C9]" : "bg-tt-milk opacity-70"}`}>
                <img src="/assets/3d/points-coins.webp" alt="" className="h-10 w-10 object-contain" />
                <span className="min-w-0 flex-1 text-sm">
                  <b>Use my Bean Points</b>
                  <span className="block text-xs text-tt-soft">{pointsOff ? `${usable} of your ${points} points = ${mvr(pointsOff)} off` : `You have ${points} points. Use ${rules.min}+ at checkout.`}</span>
                </span>
                <input type="checkbox" disabled={!pointsOff} checked={usePoints && !!pointsOff} onChange={(e) => setUsePoints(e.target.checked)} className="h-5 w-5 accent-[#1B8053]" />
              </label>
            ) : null}
            <dl className="mt-4 space-y-2 border-t border-tt-line pt-4 text-[15px]">
              <div className="flex justify-between"><dt className="text-tt-soft">Subtotal</dt><dd>{mvr(subtotal)}</dd></div>
              {discount ? <div className="flex justify-between text-[#9A6A12]"><dt>Bean Points</dt><dd>-{mvr(discount)}</dd></div> : null}
              <div className="flex justify-between"><dt className="text-tt-soft">Delivery</dt><dd>{fee ? mvr(fee) : "Confirmed in chat"}</dd></div>
              <div className="flex justify-between pt-2 text-lg font-bold"><dt>Total</dt><dd className="tt-display text-2xl">{mvr(total)}</dd></div>
            </dl>
            {earnNext ? <p className="mt-2 text-xs font-semibold text-[#9A6A12]">You will earn {earnNext} Bean Points when this order is delivered.</p> : null}
            {error ? <p className="mt-4 rounded-2xl bg-tt-blush px-4 py-3 text-sm font-semibold text-[#8C2F45]" role="alert">{error}</p> : null}
            <button type="submit" disabled={busy || !slipOk} className="mt-5 flex h-16 w-full items-center justify-center gap-2 rounded-[20px] bg-tt-leaf px-4 text-center text-[17px] font-bold text-white shadow-[0_16px_30px_-16px_rgba(27,128,83,0.9)] transition-colors hover:bg-tt-leafdeep disabled:cursor-not-allowed disabled:bg-[#CFC8DC] disabled:shadow-none">
              {!slipOk && !busy ? <IconLock size={18} /> : null}
              {busy ? "Placing your order..." : slipOk ? "Place order" : slipState === "reading" ? "Checking your slip..." : slip ? "Upload the right slip to continue" : "Upload your transfer slip to continue"}
            </button>
            <p className="mt-3 text-center text-xs text-tt-soft">{settings.announcement}</p>
          </div>
        </aside>
      </form>
    </div>
  );
}
