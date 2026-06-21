-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create racks table
CREATE TABLE racks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create items table
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number VARCHAR(100) UNIQUE NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  rack_id UUID NOT NULL REFERENCES racks(id) ON DELETE RESTRICT,
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create stock_in table
CREATE TABLE stock_in (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Create delivery_orders table
CREATE TABLE delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  do_number VARCHAR(50) UNIQUE NOT NULL,
  po_number VARCHAR(100) NOT NULL,
  shipping VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Create delivery_order_details table
CREATE TABLE delivery_order_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL CHECK (qty > 0)
);

-- Create stock_movements table
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('stock_in', 'delivery_order')),
  qty INTEGER NOT NULL CHECK (qty > 0),
  reference_number VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_rack ON items(rack_id);
CREATE INDEX idx_stock_in_item ON stock_in(item_id);
CREATE INDEX idx_do_details_do ON delivery_order_details(delivery_order_id);
CREATE INDEX idx_do_details_item ON delivery_order_details(item_id);
CREATE INDEX idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at DESC);
CREATE INDEX idx_delivery_orders_created ON delivery_orders(created_at DESC);
