export type Role = "admin" | "user"

export interface User {
  id: string
  username: string
  role: Role
  created_at: string
}

export interface Category {
  id: string
  name: string
}

export interface Rack {
  id: string
  rack_code: string
  description: string | null
}

export interface Item {
  id: string
  part_number: string
  category: string | null
  rack: string | null
  current_stock: number
}

export interface StockIn {
  id: string
  item_id: string
  qty: number
  note: string | null
  created_at: string
  created_by: string
  items?: Item
}

export interface DeliveryOrder {
  id: string
  do_number: string
  po_number: string
  shipping: string
  created_at: string
  created_by: string
  delivery_order_details?: DeliveryOrderDetail[]
}

export interface DeliveryOrderDetail {
  id: string
  delivery_order_id: string
  item_id: string
  qty: number
  items?: Item
}

export interface Menu {
  id: string
  name: string
  url: string | null
  icon: string | null
  parent_id: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  children?: Menu[]
}

export interface RoleRecord {
  id: string
  name: string
  description: string | null
  access_menus: string[] | null
  created_at: string
}

export interface StockMovement {
  id: string
  item_id: string
  movement_type: "stock_in" | "delivery_order"
  qty: number
  reference_number: string
  created_at: string
  items?: Item
}
