-- Failed back-office sign-ins, used to pause a username after too many wrong passwords.
CREATE TABLE IF NOT EXISTS admin_login_fails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS admin_login_fails_user ON admin_login_fails (username, at);
