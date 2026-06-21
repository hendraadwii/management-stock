-- ============================================================
-- REMOVE ALL FOREIGN KEY CONSTRAINTS + RENAME TABLES (mst_)
-- ============================================================
-- Bisa dijalankan berkali-kali tanpa error
-- ============================================================

-- ============================================================
-- 1. HAPUS SEMUA FK CONSTRAINTS
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'f' AND connamespace = 'public'::regnamespace
  ) LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
  END LOOP;
END $$;

-- ============================================================
-- 2. HAPUS CHECK CONSTRAINTS (current_stock >= 0, movement_type)
-- ============================================================
ALTER TABLE IF EXISTS mst_items DROP CONSTRAINT IF EXISTS items_current_stock_check;
ALTER TABLE IF EXISTS mst_items DROP CONSTRAINT IF EXISTS mst_items_current_stock_check;
ALTER TABLE IF EXISTS items DROP CONSTRAINT IF EXISTS items_current_stock_check;
ALTER TABLE IF EXISTS stock_in DROP CONSTRAINT IF EXISTS stock_in_qty_check;
ALTER TABLE IF EXISTS delivery_order_details DROP CONSTRAINT IF EXISTS delivery_order_details_qty_check;
ALTER TABLE IF EXISTS stock_movements DROP CONSTRAINT IF EXISTS stock_movements_qty_check;
ALTER TABLE IF EXISTS stock_movements DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;

-- ============================================================
-- 3. RENAME TABLES KE FORMAT mst_
-- ============================================================
ALTER TABLE IF EXISTS users RENAME TO mst_users;
ALTER TABLE IF EXISTS roles RENAME TO mst_roles;
ALTER TABLE IF EXISTS menus RENAME TO mst_menus;
ALTER TABLE IF EXISTS items RENAME TO mst_items;

-- ============================================================
-- 4. PASTIKAN TABEL mst_ ADA (untuk fresh setup)
-- ============================================================
CREATE TABLE IF NOT EXISTS mst_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL DEFAULT 'admin',
  role VARCHAR(10) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mst_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  access_menus UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mst_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  url VARCHAR(500),
  icon VARCHAR(100),
  parent_id UUID,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan kolom mst_items sesuai (handle rename dari schema lama)
ALTER TABLE IF EXISTS mst_items DROP COLUMN IF EXISTS item_name;
ALTER TABLE IF EXISTS mst_items DROP COLUMN IF EXISTS category_id;
ALTER TABLE IF EXISTS mst_items DROP COLUMN IF EXISTS rack_id;
ALTER TABLE IF EXISTS mst_items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE IF EXISTS mst_items ADD COLUMN IF NOT EXISTS rack TEXT;

CREATE TABLE IF NOT EXISTS mst_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number VARCHAR(100) UNIQUE NOT NULL,
  category TEXT,
  rack TEXT,
  current_stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. PASTIKAN TABEL TRANSAKSI ADA (tanpa FK)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_in (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE TABLE IF NOT EXISTS delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  do_number VARCHAR(50) UNIQUE NOT NULL,
  po_number VARCHAR(100) NOT NULL,
  shipping VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

ALTER TABLE IF EXISTS delivery_orders ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft';

CREATE TABLE IF NOT EXISTS delivery_order_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id UUID NOT NULL,
  item_id UUID NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0)
);

-- ============================================================
-- 6. DROP stock_movements (tidak dipakai lagi)
-- ============================================================
DROP TABLE IF EXISTS stock_movements CASCADE;

-- ============================================================
-- 7. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_stock_in_item ON stock_in(item_id);
CREATE INDEX IF NOT EXISTS idx_do_details_do ON delivery_order_details(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_do_details_item ON delivery_order_details(item_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_created ON delivery_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mst_menus_parent ON mst_menus(parent_id);
CREATE INDEX IF NOT EXISTS idx_mst_menus_sort ON mst_menus(sort_order);

-- ============================================================
-- 8. SEED DATA
-- ============================================================
INSERT INTO mst_roles (name, description)
SELECT 'admin', 'Administrator with full access'
WHERE NOT EXISTS (SELECT 1 FROM mst_roles WHERE name = 'admin');

INSERT INTO mst_roles (name, description)
SELECT 'user', 'User with read-only access'
WHERE NOT EXISTS (SELECT 1 FROM mst_roles WHERE name = 'user');

INSERT INTO mst_users (username, password, role)
SELECT 'admin', 'admin', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM mst_users WHERE username = 'admin');

INSERT INTO mst_items (part_number, category, rack, current_stock)
SELECT * FROM (VALUES
  ('HOS-001', 'Hose', 'RAK-A1', 100),
  ('HOS-002', 'Hose', 'RAK-A1', 50),
  ('BOLT-001', 'Bolt', 'RAK-B1', 200),
  ('BOLT-002', 'Bolt', 'RAK-B1', 150),
  ('NUT-001', 'Nut', 'RAK-B2', 300),
  ('FIT-001', 'Fitting', 'RAK-C1', 80),
  ('SEAL-001', 'Seal', 'RAK-A2', 60)
) AS t(part_number, category, rack, current_stock)
WHERE NOT EXISTS (SELECT 1 FROM mst_items WHERE part_number = t.part_number);

INSERT INTO mst_menus (name, url, icon, sort_order)
SELECT 'Dashboard', '/dashboard', 'LayoutDashboard', 1
WHERE NOT EXISTS (SELECT 1 FROM mst_menus WHERE name = 'Dashboard');

INSERT INTO mst_menus (name, url, icon, sort_order)
SELECT 'Master Data', NULL, 'Folder', 2
WHERE NOT EXISTS (SELECT 1 FROM mst_menus WHERE name = 'Master Data');

INSERT INTO mst_menus (name, url, icon, sort_order)
SELECT 'Transaksi', NULL, 'ArrowRightLeft', 3
WHERE NOT EXISTS (SELECT 1 FROM mst_menus WHERE name = 'Transaksi');

INSERT INTO mst_menus (name, url, icon, sort_order)
SELECT 'History Stock', '/history', 'History', 4
WHERE NOT EXISTS (SELECT 1 FROM mst_menus WHERE name = 'History Stock');

DO $$
DECLARE
  master_id UUID;
  transaksi_id UUID;
BEGIN
  SELECT id INTO master_id FROM mst_menus WHERE name = 'Master Data' LIMIT 1;
  SELECT id INTO transaksi_id FROM mst_menus WHERE name = 'Transaksi' LIMIT 1;

  INSERT INTO mst_menus (name, url, icon, parent_id, sort_order)
  SELECT 'Master User', '/master/users', 'Users', master_id, 1
  WHERE NOT EXISTS (SELECT 1 FROM mst_menus WHERE name = 'Master User');

  INSERT INTO mst_menus (name, url, icon, parent_id, sort_order)
  SELECT 'Master Menu', '/master/menus', 'Menu', master_id, 2
  WHERE NOT EXISTS (SELECT 1 FROM mst_menus WHERE name = 'Master Menu');

  INSERT INTO mst_menus (name, url, icon, parent_id, sort_order)
  SELECT 'Master Role', '/master/roles', 'Shield', master_id, 3
  WHERE NOT EXISTS (SELECT 1 FROM mst_menus WHERE name = 'Master Role');

  INSERT INTO mst_menus (name, url, icon, parent_id, sort_order)
  SELECT 'Master Item', '/master/items', 'Package', master_id, 4
  WHERE NOT EXISTS (SELECT 1 FROM mst_menus WHERE name = 'Master Item');

  INSERT INTO mst_menus (name, url, icon, parent_id, sort_order)
  SELECT 'Stock Masuk', '/transactions/stock-in', 'ArrowRightLeft', transaksi_id, 1
  WHERE NOT EXISTS (SELECT 1 FROM mst_menus WHERE name = 'Stock Masuk');

  INSERT INTO mst_menus (name, url, icon, parent_id, sort_order)
  SELECT 'Delivery Order', '/transactions/delivery-order', 'Truck', transaksi_id, 2
  WHERE NOT EXISTS (SELECT 1 FROM mst_menus WHERE name = 'Delivery Order');
END $$;
