-- Stock Management - MySQL/MariaDB schema
-- Run as: mariadb -u root -p stock_management < 001_schema.sql

CREATE TABLE IF NOT EXISTS mst_users (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mst_menus (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  url VARCHAR(200) NULL,
  icon VARCHAR(50) NULL,
  parent_id CHAR(36) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_menus_parent FOREIGN KEY (parent_id) REFERENCES mst_menus(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mst_roles (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NULL,
  access_menus JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mst_items (
  id CHAR(36) PRIMARY KEY,
  part_number VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(200) NULL,
  rack VARCHAR(100) NULL,
  uom VARCHAR(20) NULL,
  standar_qty DECIMAL(12,2) NULL,
  current_stock INT NOT NULL DEFAULT 0,
  minimal_qty INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_stock_nonneg CHECK (current_stock >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS trx_stock (
  id CHAR(36) PRIMARY KEY,
  item_id CHAR(36) NOT NULL,
  qty INT NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by CHAR(36) NULL,
  CONSTRAINT fk_stock_item FOREIGN KEY (item_id) REFERENCES mst_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_stock_user FOREIGN KEY (created_by) REFERENCES mst_users(id) ON DELETE SET NULL,
  CONSTRAINT chk_stock_qty CHECK (qty > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS delivery_orders (
  id CHAR(36) PRIMARY KEY,
  do_number VARCHAR(50) NOT NULL UNIQUE,
  po_number VARCHAR(100) NOT NULL,
  shipping VARCHAR(200) NOT NULL,
  customer_desc VARCHAR(200) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by CHAR(36) NULL,
  CONSTRAINT fk_do_user FOREIGN KEY (created_by) REFERENCES mst_users(id) ON DELETE SET NULL,
  CONSTRAINT chk_do_status CHECK (status IN ('draft','submitted'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS delivery_order_details (
  id CHAR(36) PRIMARY KEY,
  delivery_order_id CHAR(36) NOT NULL,
  item_id CHAR(36) NOT NULL,
  qty INT NOT NULL,
  CONSTRAINT fk_dod_do FOREIGN KEY (delivery_order_id) REFERENCES delivery_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_dod_item FOREIGN KEY (item_id) REFERENCES mst_items(id) ON DELETE RESTRICT,
  CONSTRAINT chk_dod_qty CHECK (qty > 0)
) ENGINE=InnoDB;

CREATE INDEX idx_items_category ON mst_items(category);
CREATE INDEX idx_items_part_number ON mst_items(part_number);
CREATE INDEX idx_stock_item ON trx_stock(item_id);
CREATE INDEX idx_stock_created ON trx_stock(created_at);
CREATE INDEX idx_do_created ON delivery_orders(created_at);
CREATE INDEX idx_dod_do ON delivery_order_details(delivery_order_id);
CREATE INDEX idx_dod_item ON delivery_order_details(item_id);
