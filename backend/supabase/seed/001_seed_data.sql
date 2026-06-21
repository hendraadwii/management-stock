-- Seed categories
INSERT INTO categories (name) VALUES
  ('Hose'),
  ('Bolt'),
  ('Nut'),
  ('Fitting'),
  ('Seal');

-- Seed racks
INSERT INTO racks (rack_code, description) VALUES
  ('RAK-A1', 'Rak A baris 1'),
  ('RAK-A2', 'Rak A baris 2'),
  ('RAK-B1', 'Rak B baris 1'),
  ('RAK-B2', 'Rak B baris 2'),
  ('RAK-C1', 'Rak C baris 1');

-- Seed items (assuming categories and racks IDs from above)
-- Note: IDs will be auto-generated, run this after categories and racks are inserted
DO $$
DECLARE
  hose_id UUID;
  bolt_id UUID;
  rak_a1_id UUID;
  rak_a2_id UUID;
BEGIN
  SELECT id INTO hose_id FROM categories WHERE name = 'Hose' LIMIT 1;
  SELECT id INTO bolt_id FROM categories WHERE name = 'Bolt' LIMIT 1;
  SELECT id INTO rak_a1_id FROM racks WHERE rack_code = 'RAK-A1' LIMIT 1;
  SELECT id INTO rak_a2_id FROM racks WHERE rack_code = 'RAK-A2' LIMIT 1;

  INSERT INTO items (part_number, item_name, category_id, rack_id, current_stock) VALUES
    ('001/012', 'Hose Assy 12mm', hose_id, rak_a1_id, 100),
    ('001/015', 'Hose Assy 15mm', hose_id, rak_a1_id, 50),
    ('002/001', 'Bolt M8x30', bolt_id, rak_a2_id, 200),
    ('002/002', 'Bolt M10x40', bolt_id, rak_a2_id, 150);
END $$;
