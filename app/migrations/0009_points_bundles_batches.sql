-- Tummie Points, bundles & super saver deals, batch/expiry, instant verification.
ALTER TABLE products ADD COLUMN batch_no TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN expiry TEXT NOT NULL DEFAULT '';

ALTER TABLE orders ADD COLUMN points_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN points_discount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN points_earned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN points_refunded INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS points_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  order_code TEXT,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_points_customer ON points_ledger (customer_id);

CREATE TABLE IF NOT EXISTS bundles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  blurb TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  items_json TEXT NOT NULL DEFAULT '[]',
  price INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'bundle',
  age TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO bundles (id, name, blurb, items_json, price, kind, age, sort) VALUES
  ('first-tastes-starter', 'First Tastes Starter Pack', 'Two smooth porridges and two creamy yoghurt pouches for brand-new eaters.', '[{"id":"apple-porridge","qty":1},{"id":"broccoli-porridge","qty":1},{"id":"lf-banana-yoghurt","qty":1},{"id":"lf-pink-lady-apple-yoghurt","qty":1}]', 499, 'bundle', '6m+', 0),
  ('snack-attack-trio', 'Snack Attack Trio', 'All three Looong Sticks for tiny hands.', '[{"id":"looong-stick-purple-sweet-potato","qty":1},{"id":"looong-stick-broccoli","qty":1},{"id":"looong-stick-sweet-pumpkin","qty":1}]', 255, 'saver', '7m+', 1),
  ('pasta-night-box', 'Pasta Night Box', 'Four creamy quick-cook pastas for toddler dinners.', '[{"id":"mushroom-pasta","qty":1},{"id":"pumpkin-pasta","qty":1},{"id":"tomato-pasta","qty":1},{"id":"mac-and-cheese","qty":1}]', 549, 'bundle', '12m+', 2),
  ('pouch-party-5', 'Pouch Party 5-Pack', 'Every Little Freddie pouch, one of each.', '[{"id":"lf-blueberry-banana-yoghurt","qty":1},{"id":"lf-banana-yoghurt","qty":1},{"id":"lf-pink-lady-apple-yoghurt","qty":1},{"id":"lf-prunes-apples","qty":1},{"id":"lf-strawberries-blueberries-oats","qty":1}]', 579, 'saver', '6m+', 3);

INSERT OR IGNORE INTO settings (key, value) VALUES ('points_per_mvr', '10'), ('point_value', '0.5'), ('points_min_redeem', '20');
INSERT INTO settings (key, value) VALUES ('require_approval', '0') ON CONFLICT(key) DO UPDATE SET value = '0';
UPDATE customers SET status = 'approved', approved_at = COALESCE(approved_at, datetime('now')) WHERE status = 'pending';
