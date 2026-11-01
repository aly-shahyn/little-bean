-- Brand logos for the scrolling strip, and password reset support (additive only)
ALTER TABLE brands ADD COLUMN logo TEXT NOT NULL DEFAULT '';
ALTER TABLE customers ADD COLUMN reset_requested_at TEXT;
ALTER TABLE customers ADD COLUMN reset_hash TEXT;
ALTER TABLE customers ADD COLUMN reset_expires TEXT;
