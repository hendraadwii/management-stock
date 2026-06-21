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
-- 3. CREATE TABLES (IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL DEFAULT 'admin',
  role VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan kolom id memiliki default gen_random_uuid() dan tidak terikat auth.users jika tabel sudah ada sebelumnya
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

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_name)
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

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS racks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number VARCHAR(100) UNIQUE NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  rack_id UUID NOT NULL REFERENCES racks(id) ON DELETE RESTRICT,
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
-- 4. INDEXES (IF NOT EXISTS aman dijalankan ulang)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_rack ON items(rack_id);
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
-- 5. SEED DATA (hanya jika tabel kosong)
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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE username = 'admin') THEN
    INSERT INTO user_roles (user_id, role_name)
    SELECT id, 'admin' FROM users WHERE username = 'admin'
    ON CONFLICT (user_id, role_name) DO NOTHING;
  END IF;
END $$;

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
  SELECT 'Stock Masuk', '/transactions/stock-in', 'ArrowRightLeft', transaksi_id, 1
  WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Stock Masuk');

  INSERT INTO menus (name, url, icon, parent_id, sort_order)
  SELECT 'Delivery Order', '/transactions/delivery-order', 'Truck', transaksi_id, 2
  WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Delivery Order');
END $$;

INSERT INTO categories (name)
SELECT name FROM (VALUES ('Hose'), ('Bolt'), ('Nut'), ('Fitting'), ('Seal')) AS t(name)
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = t.name);

INSERT INTO racks (rack_code, description)
SELECT rack_code, description FROM (VALUES 
  ('RAK-A1', 'Rak A baris 1'),
  ('RAK-A2', 'Rak A baris 2'),
  ('RAK-B1', 'Rak B baris 1'),
  ('RAK-B2', 'Rak B baris 2'),
  ('RAK-C1', 'Rak C baris 1')
) AS t(rack_code, description)
WHERE NOT EXISTS (SELECT 1 FROM racks WHERE rack_code = t.rack_code);
