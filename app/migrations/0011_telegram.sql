-- Telegram bot for password reset links.
ALTER TABLE customers ADD COLUMN telegram_chat_id TEXT;
ALTER TABLE customers ADD COLUMN telegram_linked_at TEXT;
CREATE INDEX IF NOT EXISTS idx_customers_tg ON customers (telegram_chat_id);
INSERT OR IGNORE INTO settings (key, value) VALUES ('telegram_bot_username', '');
