import { NextRequest, NextResponse } from "next/server"
import { count, eq } from "drizzle-orm"
import { db } from "@/db"
import { items, stockTransactions, deliveryOrderDetails } from "@/db/schema"
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
    const part_number = String(body?.part_number ?? "").trim()

    if (!part_number) {
      return NextResponse.json({ error: "Part Number harus diisi" }, { status: 400 })
    }

    const [duplicate] = await db
      .select({ id: items.id })
      .from(items)
      .where(eq(items.part_number, part_number))
      .limit(1)

    if (duplicate && duplicate.id !== id) {
      return NextResponse.json({ error: "Part Number sudah digunakan" }, { status: 409 })
    }

    await db
      .update(items)
      .set({
        part_number,
        category: body?.category?.trim() || null,
        rack: body?.rack?.trim() || null,
        uom: body?.uom || null,
        standar_qty:
          body?.standar_qty != null && body.standar_qty !== ""
            ? String(body.standar_qty)
            : null,
      })
      .where(eq(items.id, id))

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

    const [stockCount] = await db
      .select({ value: count() })
      .from(stockTransactions)
      .where(eq(stockTransactions.item_id, id))
    const [doCount] = await db
      .select({ value: count() })
      .from(deliveryOrderDetails)
      .where(eq(deliveryOrderDetails.item_id, id))

    if ((stockCount?.value ?? 0) > 0 || (doCount?.value ?? 0) > 0) {
      const reasons: string[] = []
      if ((stockCount?.value ?? 0) > 0) reasons.push("Stock")
      if ((doCount?.value ?? 0) > 0) reasons.push("Delivery Order")
      return NextResponse.json(
        { error: `Item tidak bisa dihapus karena masih memiliki data di ${reasons.join(" & ")}` },
        { status: 409 }
      )
    }

    await db.delete(items).where(eq(items.id, id))
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
