import { NextRequest, NextResponse } from "next/server"
import { eq, sql } from "drizzle-orm"
import { db } from "@/db"
import { items, stockTransactions } from "@/db/schema"
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
    const qty = parseInt(String(body?.qty ?? ""), 10)

    if (!qty || qty <= 0) {
      return NextResponse.json({ error: "Qty harus lebih dari 0" }, { status: 400 })
    }

    const [record] = await db
      .select()
      .from(stockTransactions)
      .where(eq(stockTransactions.id, id))
      .limit(1)

    if (!record) {
      return NextResponse.json({ error: "Data stock tidak ditemukan" }, { status: 404 })
    }

    const note = body?.note?.trim() || null

    await db.transaction(async (tx) => {
      const oldQty = record.qty
      await tx
        .update(stockTransactions)
        .set({ qty, note })
        .where(eq(stockTransactions.id, id))
      await tx
        .update(items)
        .set({ current_stock: sql`GREATEST(0, ${items.current_stock} - ${oldQty} + ${qty})` })
        .where(eq(items.id, record.item_id))
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

    const [record] = await db
      .select()
      .from(stockTransactions)
      .where(eq(stockTransactions.id, id))
      .limit(1)

    if (!record) {
      return NextResponse.json({ error: "Data stock tidak ditemukan" }, { status: 404 })
    }

    await db.transaction(async (tx) => {
      await tx.delete(stockTransactions).where(eq(stockTransactions.id, id))
      await tx
        .update(items)
        .set({ current_stock: sql`GREATEST(0, ${items.current_stock} - ${record.qty})` })
        .where(eq(items.id, record.item_id))
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
