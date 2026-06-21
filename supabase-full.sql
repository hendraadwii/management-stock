-- ============================================================
-- STOCK MANAGEMENT SYSTEM - SETUP SQL (AMAN)
-- ============================================================
-- Bisa dijalankan berkali-kali tanpa error
-- Login default: admin / admin
-- ============================================================

-- ============================================================
-- 1. HAPUS SEMUA RLS POLICIES (kalau ada)
-- ============================================================
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN (
    SELECT policyname, tablename FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ============================================================
-- 2. DISABLE RLS DI SEMUA TABEL
-- ============================================================
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN (
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;

-- ============================================================
-- 3. DROP TABLES YANG TIDAK DIGUNAKAN LAGI
-- ============================================================
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS racks CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- ============================================================
-- 4. ALTER ITEMS (hapus kolom lama, tambah kolom baru)
-- ============================================================
ALTER TABLE items DROP COLUMN IF EXISTS item_name;
ALTER TABLE items DROP COLUMN IF EXISTS category_id;
ALTER TABLE items DROP COLUMN IF EXISTS rack_id;
ALTER TABLE items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS rack TEXT;

-- ============================================================
-- 5. CREATE TABLES (IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL DEFAULT 'admin',
  role VARCHAR(10) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  access_menus UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  url VARCHAR(500),
  icon VARCHAR(100),
  parent_id UUID REFERENCES menus(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number VARCHAR(100) UNIQUE NOT NULL,
  category TEXT,
  rack TEXT,
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_in (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  do_number VARCHAR(50) UNIQUE NOT NULL,
  po_number VARCHAR(100) NOT NULL,
  shipping VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS delivery_order_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL CHECK (qty > 0)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('stock_in', 'delivery_order')),
  qty INTEGER NOT NULL CHECK (qty > 0),
  reference_number VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_stock_in_item ON stock_in(item_id);
CREATE INDEX IF NOT EXISTS idx_do_details_do ON delivery_order_details(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_do_details_item ON delivery_order_details(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_created ON delivery_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menus_parent ON menus(parent_id);
CREATE INDEX IF NOT EXISTS idx_menus_sort ON menus(sort_order);

-- ============================================================
-- 7. SEED DATA
-- ============================================================

INSERT INTO roles (name, description)
SELECT 'admin', 'Administrator with full access'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

INSERT INTO roles (name, description)
SELECT 'user', 'User with read-only access'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'user');

INSERT INTO users (username, password, role)
SELECT 'admin', 'admin', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

INSERT INTO items (part_number, category, rack, current_stock)
SELECT * FROM (VALUES
  ('HOS-001', 'Hose', 'RAK-A1', 100),
  ('HOS-002', 'Hose', 'RAK-A1', 50),
  ('BOLT-001', 'Bolt', 'RAK-B1', 200),
  ('BOLT-002', 'Bolt', 'RAK-B1', 150),
  ('NUT-001', 'Nut', 'RAK-B2', 300),
  ('FIT-001', 'Fitting', 'RAK-C1', 80),
  ('SEAL-001', 'Seal', 'RAK-A2', 60)
) AS t(part_number, category, rack, current_stock)
WHERE NOT EXISTS (SELECT 1 FROM items WHERE part_number = t.part_number);

INSERT INTO menus (name, url, icon, sort_order)
SELECT 'Dashboard', '/dashboard', 'LayoutDashboard', 1
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Dashboard');

INSERT INTO menus (name, url, icon, sort_order)
SELECT 'Master Data', NULL, 'Folder', 2
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Master Data');

INSERT INTO menus (name, url, icon, sort_order)
SELECT 'Transaksi', NULL, 'ArrowRightLeft', 3
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Transaksi');

INSERT INTO menus (name, url, icon, sort_order)
SELECT 'History Stock', '/history', 'History', 4
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'History Stock');

DO $$
DECLARE
  master_id UUID;
  transaksi_id UUID;
BEGIN
  SELECT id INTO master_id FROM menus WHERE name = 'Master Data' LIMIT 1;
  SELECT id INTO transaksi_id FROM menus WHERE name = 'Transaksi' LIMIT 1;

  INSERT INTO menus (name, url, icon, parent_id, sort_order)
  SELECT 'Master User', '/master/users', 'Users', master_id, 1
  WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Master User');

  INSERT INTO menus (name, url, icon, parent_id, sort_order)
  SELECT 'Master Menu', '/master/menus', 'Menu', master_id, 2
  WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Master Menu');

  INSERT INTO menus (name, url, icon, parent_id, sort_order)
  SELECT 'Master Role', '/master/roles', 'Shield', master_id, 3
  WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Master Role');

  INSERT INTO menus (name, url, icon, parent_id, sort_order)
  SELECT 'Master Item', '/master/items', 'Package', master_id, 4
  WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Master Item');

  INSERT INTO menus (name, url, icon, parent_id, sort_order)
  SELECT 'Stock Masuk', '/transactions/stock-in', 'ArrowRightLeft', transaksi_id, 1
  WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Stock Masuk');

  INSERT INTO menus (name, url, icon, parent_id, sort_order)
  SELECT 'Delivery Order', '/transactions/delivery-order', 'Truck', transaksi_id, 2
  WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Delivery Order');
END $$;
