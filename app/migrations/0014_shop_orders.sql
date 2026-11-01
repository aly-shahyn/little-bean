-- Orders added by the shop from the admin (phone, Viber, walk-in), and customers the shop created.
ALTER TABLE orders ADD COLUMN source TEXT NOT NULL DEFAULT 'online';
ALTER TABLE orders ADD COLUMN created_by TEXT NOT NULL DEFAULT '';
ALTER TABLE customers ADD COLUMN created_by TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
