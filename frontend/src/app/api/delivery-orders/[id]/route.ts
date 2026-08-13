import { NextRequest, NextResponse } from "next/server"
import { eq, sql } from "drizzle-orm"
import { db } from "@/db"
import { deliveryOrders, deliveryOrderDetails, items } from "@/db/schema"
import { requireAdmin } from "@/lib/auth"
import { handleError } from "@/lib/api-helpers"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()

    const [order] = await db
      .select()
      .from(deliveryOrders)
      .where(eq(deliveryOrders.id, id))
      .limit(1)

    if (!order) {
      return NextResponse.json({ error: "Delivery Order tidak ditemukan" }, { status: 404 })
    }
    if (order.status === "submitted") {
      return NextResponse.json({ error: "Tidak bisa mengedit DO yang sudah disubmit" }, { status: 400 })
    }

    const po_number = String(body?.po_number ?? "").trim()
    const shipping = String(body?.shipping ?? "").trim()
    const formItems: { item_id: string; qty: number }[] = Array.isArray(body?.items)
      ? body.items
      : []

    if (!po_number || !shipping) {
      return NextResponse.json({ error: "Nomor PO dan Shipping harus diisi" }, { status: 400 })
    }
    if (formItems.length === 0) {
      return NextResponse.json({ error: "Minimal 1 item harus ditambahkan" }, { status: 400 })
    }

    await db.transaction(async (tx) => {
      await tx
        .update(deliveryOrders)
        .set({
          po_number,
          shipping,
          customer_desc: body?.customer_desc?.trim() || null,
        })
        .where(eq(deliveryOrders.id, id))

      await tx.delete(deliveryOrderDetails).where(eq(deliveryOrderDetails.delivery_order_id, id))

      await tx.insert(deliveryOrderDetails).values(
        formItems.map((f) => ({
          delivery_order_id: id,
          item_id: f.item_id,
          qty: f.qty,
        }))
      )
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const [order] = await db
      .select()
      .from(deliveryOrders)
      .where(eq(deliveryOrders.id, id))
      .limit(1)

    if (!order) {
      return NextResponse.json({ error: "Delivery Order tidak ditemukan" }, { status: 404 })
    }

    const details = await db
      .select()
      .from(deliveryOrderDetails)
      .where(eq(deliveryOrderDetails.delivery_order_id, id))

    await db.transaction(async (tx) => {
      if (order.status === "submitted") {
        for (const d of details) {
          await tx
            .update(items)
            .set({ current_stock: sql`${items.current_stock} + ${d.qty}` })
            .where(eq(items.id, d.item_id))
        }
      }
      await tx.delete(deliveryOrderDetails).where(eq(deliveryOrderDetails.delivery_order_id, id))
      await tx.delete(deliveryOrders).where(eq(deliveryOrders.id, id))
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const [order] = await db
      .select()
      .from(deliveryOrders)
      .where(eq(deliveryOrders.id, id))
      .limit(1)

    if (!order) {
      return NextResponse.json({ error: "Delivery Order tidak ditemukan" }, { status: 404 })
    }
    if (order.status !== "draft") {
      return NextResponse.json({ error: "Hanya DO dengan status draft yang bisa disubmit" }, { status: 400 })
    }

    const details = await db
      .select()
      .from(deliveryOrderDetails)
      .where(eq(deliveryOrderDetails.delivery_order_id, id))

    if (details.length === 0) {
      return NextResponse.json({ error: "DO tidak memiliki detail item" }, { status: 400 })
    }

    await db.transaction(async (tx) => {
      for (const d of details) {
        const [item] = await tx
          .select({ current_stock: items.current_stock })
          .from(items)
          .where(eq(items.id, d.item_id))
          .limit(1)

        if (!item) {
          throw new Error(`Item ${d.item_id} tidak ditemukan`)
        }
        const newStock = item.current_stock - d.qty
        if (newStock < 0) {
          throw new Error(`Stock tidak mencukupi`)
        }
        await tx
          .update(items)
          .set({ current_stock: newStock })
          .where(eq(items.id, d.item_id))
      }

      await tx
        .update(deliveryOrders)
        .set({ status: "submitted" })
        .where(eq(deliveryOrders.id, id))
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
