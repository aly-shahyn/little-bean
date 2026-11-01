-- Inventory, expenses, new order journey, customer profile extras (additive only)
ALTER TABLE products ADD COLUMN stock INTEGER;
ALTER TABLE products ADD COLUMN cost_price INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN low_stock INTEGER NOT NULL DEFAULT 5;
ALTER TABLE products ADD COLUMN sku TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS stock_moves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  unit_cost INTEGER NOT NULL DEFAULT 0,
  order_code TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_moves_product ON stock_moves(product_id);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spent_on TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(spent_on);

ALTER TABLE orders ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'preparing';
ALTER TABLE orders ADD COLUMN completed_at TEXT;
ALTER TABLE orders ADD COLUMN cogs INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN stock_deducted INTEGER NOT NULL DEFAULT 0;

UPDATE orders SET status = 'confirmed' WHERE status IN ('paid', 'packed');
UPDATE orders SET status = 'completed', delivery_status = 'delivered', completed_at = COALESCE(confirmed_at, created_at) WHERE status = 'delivered';

ALTER TABLE customers ADD COLUMN avatar TEXT NOT NULL DEFAULT '';
ALTER TABLE customers ADD COLUMN baby_name TEXT NOT NULL DEFAULT '';
ALTER TABLE customers ADD COLUMN baby_birth TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS saved_products (
  customer_id INTEGER NOT NULL,
  product_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (customer_id, product_id)
);
