-- Back-office user accounts with roles. Existing passwords carry over as named logins.
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'admin',
  pass_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT NOT NULL DEFAULT '',
  last_login TEXT
);
INSERT OR IGNORE INTO admin_users (username, name, role, pass_hash, created_by)
  SELECT 'superadmin', 'Owner', 'super', value, 'migration' FROM settings WHERE key = 'admin_hash' AND value LIKE '%:%';
INSERT OR IGNORE INTO admin_users (username, name, role, pass_hash, created_by)
  SELECT 'admin', 'Admin', 'admin', value, 'migration' FROM settings WHERE key = 'admin2_hash' AND value LIKE '%:%';
