-- Automatic bank slip check at checkout: what was read from the customer's transfer slip.
ALTER TABLE orders ADD COLUMN slip_bank TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN slip_ref TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN slip_amount REAL;
ALTER TABLE orders ADD COLUMN slip_date TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN slip_checked INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_orders_slip_ref ON orders(slip_ref);
