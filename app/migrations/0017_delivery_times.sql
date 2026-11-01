-- When an order left for delivery and when it arrived, so customers can follow each step.
ALTER TABLE orders ADD COLUMN out_for_delivery_at TEXT;
ALTER TABLE orders ADD COLUMN delivered_at TEXT;
