/**
 * Bank transfer slip check (Maldives: BML and MIB app receipts).
 * Works on the text read from the screenshot (OCR runs in the customer's browser).
 * The aim is to stop wrong uploads (random photos, wrong amount, someone else's account),
 * not to replace checking the money arrived in the bank app.
 */
export type SlipBank = "BML" | "MIB";
export type SlipResult = {
  bank: SlipBank | null;
  success: boolean;
  amount: number | null;
  reference: string;
  date: string; // YYYY-MM-DD HH:MM as printed on the slip (Maldives time)
  accounts: string[]; // long digit runs found (account numbers)
};
export type SlipVerdict = { ok: boolean; problems: string[]; slip: SlipResult };

export const SLIP_MAX_AGE_DAYS = 3;

const money = (s: string) => {
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};

export function readSlip(raw: string): SlipResult {
  const text = raw.replace(/\r/g, "").replace(/[ \t]+/g, " ");
  const t = text.toLowerCase();
  // MIB receipt: "Transaction#", "Transaction Type", "Processed Date", MALDIVES ISLAMIC BANK footer.
  const isMib = /maldives\s*islamic\s*bank/.test(t) && /transaction\s*#/.test(t) && (/transaction\s*type/.test(t) || /processed\s*date/.test(t));
  // BML receipt: "Thank you. Transfer transaction is successful.", Status, Reference, Transaction date, Amount, Bank of Maldives footer.
  const bmlMarks = [
    /transfer\s+transaction\s+is\s+successful/.test(t) || /transaction\s+is\s+successful/.test(t),
    /\bstatus\b/.test(t),
    /\breference\b/.test(t),
    /transaction\s*date/.test(t),
    /\bamount\b/.test(t),
    /bank\s*of\s*maldives/.test(t),
  ].filter(Boolean).length;
  const bank: SlipBank | null = isMib ? "MIB" : bmlMarks >= 5 ? "BML" : null;
  const success = bank === "MIB" ? /\bsuccess(ful)?\b/.test(t) : /\bsuccess\b/.test(t) || /transaction\s+is\s+successful/.test(t);

  let amount: number | null = null;
  const m1 = /amount\s*:?\s*mvr\s*([\d,]+\.\d{2})/i.exec(text) ?? /mvr\s*([\d,]+\.\d{2})/i.exec(text) ?? /([\d,]+\.\d{2})\s*\n?\s*mvr/i.exec(text);
  if (m1) amount = money(m1[1]);

  let reference = "";
  const r = bank === "MIB" ? /transaction\s*#\s*:?\s*([0-9]{6,})/i.exec(text) : /reference\s*:?\s*([A-Z0-9]{8,})/i.exec(text);
  if (r) reference = r[1].toUpperCase();

  let date = "";
  const d1 = /transaction\s*date\s*:?\s*(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})/i.exec(text);
  const d2 = /transaction\s*date\s*:?\s*(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})/i.exec(text);
  if (d1) date = `${d1[1]}-${d1[2]}-${d1[3]} ${d1[4].padStart(2, "0")}:${d1[5]}`;
  else if (d2) date = `${d2[3]}-${d2[2]}-${d2[1]} ${d2[4].padStart(2, "0")}:${d2[5]}`; // BML prints dd/mm/yyyy

  const accounts = Array.from(new Set((text.match(/\d[\d ]{8,}\d/g) ?? []).map((s) => s.replace(/\s/g, "")).filter((s) => s.length >= 10 && s.length <= 20 && s !== reference)));
  return { bank, success, amount, reference, date, accounts };
}

/** Account numbers the shop accepts payments into (any 10+ digit run in the bank settings). */
export function shopAccounts(setting: string | undefined): string[] {
  return (String(setting ?? "").match(/\d[\d ]{8,}\d/g) ?? []).map((s) => s.replace(/\s/g, "")).filter((s) => s.length >= 10);
}

const fmt = (n: number) => `MVR ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function checkSlip(slip: SlipResult, total: number, accounts: string[], now = new Date()): SlipVerdict {
  const problems: string[] = [];
  if (!slip.bank) {
    problems.push("This doesn't look like a BML or MIB transfer receipt. Please upload the screenshot from your banking app.");
    return { ok: false, problems, slip };
  }
  if (!slip.success) problems.push("This transfer doesn't show as successful.");
  if (slip.amount === null) problems.push("We couldn't read the amount on this slip. Please upload a clear, full screenshot.");
  else if (Math.abs(slip.amount - total) > 0.005) problems.push(`The slip shows ${fmt(slip.amount)}, but your order total is ${fmt(total)}.`);
  if (accounts.length && !slip.accounts.some((a) => accounts.includes(a)))
    problems.push(`This transfer didn't go to our account (${accounts.join(" or ")}).`);
  if (slip.date) {
    // Slip times are Maldives time (UTC+5).
    const at = Date.parse(slip.date.replace(" ", "T") + ":00+05:00");
    const days = (now.getTime() - at) / 86400000;
    if (Number.isFinite(days) && days > SLIP_MAX_AGE_DAYS) problems.push(`This slip is from ${slip.date.slice(0, 10)}. Please upload the slip for this payment.`);
    if (Number.isFinite(days) && days < -1) problems.push("The date on this slip is in the future.");
  }
  return { ok: problems.length === 0, problems, slip };
}
