-- Weighted average cost: each stock movement remembers the product's average cost after it,
-- and a receipt keeps the logistics amount that was spread over its units.
ALTER TABLE stock_moves ADD COLUMN avg_after REAL;
ALTER TABLE stock_moves ADD COLUMN logistics REAL NOT NULL DEFAULT 0;
