import { NextResponse } from "next/server"
import { count, desc, gte, inArray, sql } from "drizzle-orm"
import { db } from "@/db"
import { items, deliveryOrders, deliveryOrderDetails, stockTransactions } from "@/db/schema"
import { requireUser } from "@/lib/auth"
import { handleError } from "@/lib/api-helpers"

export async function GET() {
  try {
    await requireUser()

    const itemRows = await db.select().from(items).orderBy(sql`part_number`)
    const totalItems = itemRows.length
    const totalStock = itemRows.reduce((acc, i) => acc + (i.current_stock ?? 0), 0)

    const lowStockItems = itemRows.filter(
      (i) => i.minimal_qty != null && i.minimal_qty > 0 && (i.current_stock ?? 0) < i.minimal_qty!
    )

    const categoryMap = new Map<string, number>()
    itemRows.forEach((i) => {
      const category = i.category || "Uncategorized"
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + (i.current_stock ?? 0))
    })
    const topCategories = Array.from(categoryMap.entries())
      .map(([category, total_stock]) => ({ category, total_stock }))
      .sort((a, b) => b.total_stock - a.total_stock)
      .slice(0, 5)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const [doCountRows] = await db
      .select({ value: count() })
      .from(deliveryOrders)
      .where(gte(deliveryOrders.created_at, startOfMonth))

    const recentDOsRaw = await db
      .select({ id: deliveryOrders.id, do_number: deliveryOrders.do_number, po_number: deliveryOrders.po_number, shipping: deliveryOrders.shipping, created_at: deliveryOrders.created_at })
      .from(deliveryOrders)
      .orderBy(desc(deliveryOrders.created_at))
      .limit(5)

    const recentDoIds = recentDOsRaw.map((d) => d.id)
    const recentDetails = recentDoIds.length
      ? await db
          .select({ delivery_order_id: deliveryOrderDetails.delivery_order_id, qty: deliveryOrderDetails.qty })
          .from(deliveryOrderDetails)
          .where(inArray(deliveryOrderDetails.delivery_order_id, recentDoIds))
      : []

    const qtyMap = new Map<string, number>()
    recentDetails.forEach((d) => {
      qtyMap.set(d.delivery_order_id, (qtyMap.get(d.delivery_order_id) ?? 0) + d.qty)
    })

    const recentDOs = recentDOsRaw.map((d) => ({
      ...d,
      total_qty: qtyMap.get(d.id) ?? 0,
    }))

    // Monthly movements (last 6 months)
    const stockIns = await db
      .select({ qty: stockTransactions.qty, created_at: stockTransactions.created_at })
      .from(stockTransactions)
      .where(gte(stockTransactions.created_at, sixMonthsAgo))

    const monthRangeOrders = await db
      .select({ id: deliveryOrders.id, created_at: deliveryOrders.created_at })
      .from(deliveryOrders)
      .where(gte(deliveryOrders.created_at, sixMonthsAgo))

    const monthRangeIds = monthRangeOrders.map((o) => o.id)
    const monthDetails = monthRangeIds.length
      ? await db
          .select({ delivery_order_id: deliveryOrderDetails.delivery_order_id, qty: deliveryOrderDetails.qty })
          .from(deliveryOrderDetails)
          .where(inArray(deliveryOrderDetails.delivery_order_id, monthRangeIds))
      : []

    const monthMap = new Map<string, { stock_in: number; delivery: number }>()
    const monthKey = (d: Date) =>
      d.toLocaleDateString("id-ID", { year: "numeric", month: "short" })

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      monthMap.set(monthKey(d), { stock_in: 0, delivery: 0 })
    }

    stockIns.forEach((r) => {
      const key = monthKey(new Date(r.created_at ?? new Date()))
      const entry = monthMap.get(key)
      if (entry) entry.stock_in += r.qty ?? 0
    })

    const doDateMap = new Map(monthRangeOrders.map((o) => [o.id, o.created_at]))
    monthDetails.forEach((r) => {
      const createdAt = doDateMap.get(r.delivery_order_id)
      if (!createdAt) return
      const key = monthKey(new Date(createdAt))
      const entry = monthMap.get(key)
      if (entry) entry.delivery += r.qty ?? 0
    })

    const monthlyMovements = Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      ...data,
    }))

    return NextResponse.json({
      data: {
        totalItems,
        totalStock,
        totalDO: doCountRows?.value ?? 0,
        lowStockCount: lowStockItems.length,
        topCategories,
        lowStockItems,
        monthlyMovements,
        recentDOs,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
