-- Customer accounts, editable brands/categories, order approval (additive only)
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL DEFAULT '',
  island TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  pass_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT,
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS customer_sessions (
  token_hash TEXT PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_customer ON customer_sessions(customer_id);

CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT '',
  about TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  blurb TEXT NOT NULL DEFAULT '',
  tint TEXT NOT NULL DEFAULT '#DCEADB',
  ink TEXT NOT NULL DEFAULT '#2C5040',
  image TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE orders ADD COLUMN customer_id INTEGER;
ALTER TABLE orders ADD COLUMN admin_note TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN confirmed_at TEXT;
ALTER TABLE orders ADD COLUMN notify_log TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;

UPDATE orders SET status = 'pending' WHERE status = 'new';

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('require_approval', '1'),
  ('wa_phone_number_id', ''),
  ('wa_token', ''),
  ('wa_lang', 'en'),
  ('wa_tpl_placed', ''),
  ('wa_tpl_confirmed', ''),
  ('wa_tpl_account', '');
