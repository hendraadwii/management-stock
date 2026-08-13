import { NextRequest, NextResponse } from "next/server"
import { desc, eq, sql } from "drizzle-orm"
import { db } from "@/db"
import { items, stockTransactions } from "@/db/schema"
import { requireUser, requireAdmin } from "@/lib/auth"
import { handleError } from "@/lib/api-helpers"

export async function GET() {
  try {
    await requireUser()
    const data = await db
      .select()
      .from(stockTransactions)
      .orderBy(desc(stockTransactions.created_at))
    return NextResponse.json({ data })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin()
    const itemId = request.nextUrl.searchParams.get("item_id")

    if (!itemId) {
      return NextResponse.json({ error: "item_id wajib diisi" }, { status: 400 })
    }

    await db.transaction(async (tx) => {
      await tx.delete(stockTransactions).where(eq(stockTransactions.item_id, itemId))
      await tx.update(items).set({ current_stock: 0 }).where(eq(items.id, itemId))
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin()
    const body = await request.json()
    const item_id = String(body?.item_id ?? "")
    const qty = parseInt(String(body?.qty ?? ""), 10)

    if (!item_id || !qty || qty <= 0) {
      return NextResponse.json({ error: "Pilih barang dan masukkan qty yang valid" }, { status: 400 })
    }

    const [item] = await db.select().from(items).where(eq(items.id, item_id)).limit(1)
    if (!item) {
      return NextResponse.json({ error: "Barang tidak ditemukan" }, { status: 404 })
    }

    const note = body?.note?.trim() || null

    const result = await db.transaction(async (tx) => {
      const [record] = await tx
        .insert(stockTransactions)
        .values({
          item_id,
          qty,
          note,
          created_by: user.id,
        })
        .$returningId()

      await tx
        .update(items)
        .set({ current_stock: sql`${items.current_stock} + ${qty}` })
        .where(eq(items.id, item_id))

      return record
    })

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
