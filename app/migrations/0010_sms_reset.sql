-- Automatic password reset by SMS: remember how the last link was delivered.
ALTER TABLE customers ADD COLUMN reset_sent_at TEXT;
ALTER TABLE customers ADD COLUMN reset_channel TEXT NOT NULL DEFAULT '';
INSERT OR IGNORE INTO settings (key, value) VALUES ('sms_provider', ''), ('sms_http_method', 'POST'), ('sms_sender', 'TinnyTummy');
