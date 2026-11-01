/**
 * Weighted average cost (WAC) for stock.
 *
 * Every shipment has its own landed cost per unit = product cost per unit + (logistics for the
 * shipment / units in it). When it arrives, the product's cost becomes the average of what is
 * already on the shelf and what just came in, weighted by units:
 *
 *   new average = (units on hand x current average + units received x landed cost)
 *                 / (units on hand + units received)
 *
 * Selling, damaging or correcting stock never changes the average; it only changes the units.
 * The server runs the same formula inside one SQL statement (see WAC_RECEIVE_SQL) so two
 * receipts at the same moment can't read a stale average.
 */
export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export const round4 = (n: number) => Math.round((Number(n) || 0) * 10000) / 10000;

/** Money typed in the admin: non-negative, 2 decimals. */
export const money = (v: unknown) => Math.max(0, round2(Number(v) || 0));

export function landedUnitCost(unitCost: number, logisticsTotal: number, qty: number) {
  if (!(qty > 0)) return 0;
  return round4(Math.max(0, unitCost) + Math.max(0, logisticsTotal) / qty);
}

export function weightedAverage(onHand: number | null | undefined, currentAvg: number | null | undefined, qty: number, landed: number) {
  const have = Math.max(0, Number(onHand) || 0);
  const avg = Math.max(0, Number(currentAvg) || 0);
  if (!(landed > 0) || !(qty > 0)) return round4(avg); // no cost given: only the units change
  if (have <= 0 || avg <= 0) return round4(landed); // nothing (or nothing costed) on the shelf
  return round4((have * avg + qty * landed) / (have + qty));
}

/**
 * ?1 = units in (positive), ?2 = landed cost per unit, ?3 = product id.
 * Right-hand sides in an SQLite UPDATE all see the row as it was before the update,
 * so `stock` and `cost_price` below are the old values.
 */
export const WAC_RECEIVE_SQL = `UPDATE products SET
  cost_price = CASE WHEN ?2 > 0 THEN ROUND(
      CASE WHEN MAX(COALESCE(stock, 0), 0) > 0 AND cost_price > 0
        THEN (MAX(COALESCE(stock, 0), 0) * cost_price * 1.0 + ?1 * ?2) / (MAX(COALESCE(stock, 0), 0) + ?1)
        ELSE ?2 * 1.0 END, 4)
    ELSE cost_price END,
  stock = MAX(COALESCE(stock, 0), 0) + ?1
WHERE id = ?3`;
