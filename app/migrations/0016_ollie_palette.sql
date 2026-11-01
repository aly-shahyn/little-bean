-- Ollie & Co rebrand: brighter "sunny pastel" category colours.
-- Only rows still on the original seeded colours are changed, so admin edits are kept.
UPDATE categories SET tint = '#FFD6C7' WHERE tint = '#FFE3D3';
UPDATE categories SET tint = '#FFE9A8' WHERE tint = '#FFF1C8';
UPDATE categories SET tint = '#D8F3E3', ink = '#157A52' WHERE tint = '#DCEADB' AND ink = '#2C5040';
UPDATE categories SET tint = '#FFDDE6' WHERE tint = '#F8DCE0';
UPDATE categories SET tint = '#E7E0FF' WHERE tint = '#E8E2F6';
