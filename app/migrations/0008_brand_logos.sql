-- Cleaned-up brand logos (transparent PNGs) for the brand strip.
UPDATE brands SET logo = '/assets/brands/double-happiness.png' WHERE id = 'double-happiness' AND (logo IS NULL OR logo = '');
UPDATE brands SET logo = '/assets/brands/little-freddie.png' WHERE id = 'little-freddie' AND (logo IS NULL OR logo = '');
UPDATE brands SET logo = '/assets/brands/pure-eat.png' WHERE id = 'pure-eat' AND (logo IS NULL OR logo = '');
UPDATE brands SET logo = '/assets/brands/mennosato.png' WHERE id = 'mennosato' AND (logo IS NULL OR logo = '');
UPDATE brands SET logo = '/assets/brands/bms-organics.png' WHERE id = 'bms-organics' AND (logo IS NULL OR logo = '');
UPDATE brands SET logo = '/assets/brands/organic-wave.png' WHERE id = 'organic-wave' AND (logo IS NULL OR logo = '');
