-- Tinny Tummies shop schema (additive only)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  age TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL,
  weight TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL,
  short TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  ingredients TEXT NOT NULL DEFAULT '',
  highlights TEXT NOT NULL DEFAULT '',
  allergy TEXT NOT NULL DEFAULT '',
  serve TEXT NOT NULL DEFAULT '',
  in_stock INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  price_confirmed INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  island TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  payment TEXT NOT NULL,
  items_json TEXT NOT NULL,
  subtotal INTEGER NOT NULL,
  delivery INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  slip_key TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('whatsapp', ''),
  ('viber', ''),
  ('bank_name', 'Bank of Maldives'),
  ('bank_account_name', ''),
  ('bank_account_number', ''),
  ('delivery_fee', '0'),
  ('delivery_note', 'We deliver across Male, Hulhumale and Villimale. For other islands, we send by ferry or speedboat. Message us for rates.'),
  ('announcement', 'Instant purchase only. No refunds or returns, so please double-check your order.'),
  ('instagram', 'tinnytummiesmv');
