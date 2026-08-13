import { randomUUID } from "crypto"
import {
  mysqlTable,
  char,
  varchar,
  text,
  int,
  decimal,
  timestamp,
  json,
  tinyint,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core"

const uuid = (name: string) =>
  char(name, { length: 36 })
    .primaryKey()
    .$defaultFn(() => randomUUID())

export const users = mysqlTable(
  "mst_users",
  {
    id: uuid("id"),
    username: varchar("username", { length: 100 }).notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).notNull().default("user"),
    created_at: timestamp("created_at").defaultNow(),
  },
  (t) => [uniqueIndex("uq_users_username").on(t.username)]
)

export const menus = mysqlTable(
  "mst_menus",
  {
    id: uuid("id"),
    name: varchar("name", { length: 200 }).notNull(),
    url: varchar("url", { length: 200 }),
    icon: varchar("icon", { length: 50 }),
    parent_id: char("parent_id", { length: 36 }),
    sort_order: int("sort_order").notNull().default(0),
    is_active: tinyint("is_active").notNull().default(1),
    created_at: timestamp("created_at").defaultNow(),
  },
  (t) => [index("idx_menus_parent").on(t.parent_id)]
)

export const roles = mysqlTable(
  "mst_roles",
  {
    id: uuid("id"),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    access_menus: json("access_menus").$type<string[]>(),
    created_at: timestamp("created_at").defaultNow(),
  },
  (t) => [uniqueIndex("uq_roles_name").on(t.name)]
)

export const items = mysqlTable(
  "mst_items",
  {
    id: uuid("id"),
    part_number: varchar("part_number", { length: 100 }).notNull(),
    category: varchar("category", { length: 200 }),
    rack: varchar("rack", { length: 100 }),
    uom: varchar("uom", { length: 20 }),
    standar_qty: decimal("standar_qty", { precision: 12, scale: 2 }),
    current_stock: int("current_stock").notNull().default(0),
    minimal_qty: int("minimal_qty"),
    created_at: timestamp("created_at").defaultNow(),
  },
  (t) => [uniqueIndex("uq_items_part_number").on(t.part_number), index("idx_items_category").on(t.category)]
)

export const stockTransactions = mysqlTable(
  "trx_stock",
  {
    id: uuid("id"),
    item_id: char("item_id", { length: 36 }).notNull(),
    qty: int("qty").notNull(),
    note: text("note"),
    created_at: timestamp("created_at").defaultNow(),
    created_by: char("created_by", { length: 36 }),
  },
  (t) => [index("idx_stock_item").on(t.item_id), index("idx_stock_created").on(t.created_at)]
)

export const deliveryOrders = mysqlTable(
  "delivery_orders",
  {
    id: uuid("id"),
    do_number: varchar("do_number", { length: 50 }).notNull(),
    po_number: varchar("po_number", { length: 100 }).notNull(),
    shipping: varchar("shipping", { length: 200 }).notNull(),
    customer_desc: varchar("customer_desc", { length: 200 }),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    created_at: timestamp("created_at").defaultNow(),
    created_by: char("created_by", { length: 36 }),
  },
  (t) => [uniqueIndex("uq_do_number").on(t.do_number), index("idx_do_created").on(t.created_at)]
)

export const deliveryOrderDetails = mysqlTable(
  "delivery_order_details",
  {
    id: uuid("id"),
    delivery_order_id: char("delivery_order_id", { length: 36 }).notNull(),
    item_id: char("item_id", { length: 36 }).notNull(),
    qty: int("qty").notNull(),
  },
  (t) => [index("idx_dod_do").on(t.delivery_order_id), index("idx_dod_item").on(t.item_id)]
)
