-- Real product photos supplied by the shop (only replaces the sample placeholder).
UPDATE products SET image = '/assets/products/p26.jpg' WHERE id = 'lf-pink-lady-apple-yoghurt' AND image LIKE '/assets/samples/%';
UPDATE products SET image = '/assets/products/p30.jpg' WHERE id = 'rice-stick-multigrain' AND image LIKE '/assets/samples/%';
