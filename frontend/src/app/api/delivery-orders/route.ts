import { NextRequest, NextResponse } from "next/server"
import { desc, like } from "drizzle-orm"
import { db } from "@/db"
import { deliveryOrders, deliveryOrderDetails, items } from "@/db/schema"
import { requireUser, requireAdmin } from "@/lib/auth"
import { handleError } from "@/lib/api-helpers"

export async function GET() {
  try {
    await requireUser()
    const [orders, details, itemRows] = await Promise.all([
      db.select().from(deliveryOrders).orderBy(desc(deliveryOrders.created_at)),
      db.select().from(deliveryOrderDetails),
      db.select().from(items),
    ])

    const itemMap = new Map(itemRows.map((i) => [i.id, i]))

    const data = orders.map((o) => ({
      ...o,
      delivery_order_details: details
        .filter((d) => d.delivery_order_id === o.id)
        .map((d) => ({ ...d, items: itemMap.get(d.item_id) ?? null })),
    }))

    return NextResponse.json({ data })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin()
    const body = await request.json()
    const po_number = String(body?.po_number ?? "").trim()
    const shipping = String(body?.shipping ?? "").trim()
    const customer_desc = body?.customer_desc?.trim() || null
    const formItems: { item_id: string; qty: number }[] = Array.isArray(body?.items)
      ? body.items
      : []

    if (!po_number || !shipping) {
      return NextResponse.json({ error: "Nomor PO dan Shipping harus diisi" }, { status: 400 })
    }
    if (formItems.length === 0) {
      return NextResponse.json({ error: "Minimal 1 item harus ditambahkan" }, { status: 400 })
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")

    const [last] = await db
      .select({ do_number: deliveryOrders.do_number })
      .from(deliveryOrders)
      .where(like(deliveryOrders.do_number, `ASTEK/${year}/${month}/%`))
      .orderBy(desc(deliveryOrders.do_number))
      .limit(1)

    let seq = 1
    if (last) {
      const lastSeq = parseInt(last.do_number.split("/")[3], 10)
      if (!isNaN(lastSeq)) seq = lastSeq + 1
    }
    const do_number = `ASTEK/${year}/${month}/${String(seq).padStart(4, "0")}`

    const record = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(deliveryOrders)
        .values({
          do_number,
          po_number,
          shipping,
          customer_desc,
          status: "draft",
          created_by: user.id,
        })
        .$returningId()

      if (formItems.length > 0) {
        await tx.insert(deliveryOrderDetails).values(
          formItems.map((f) => ({
            delivery_order_id: created.id,
            item_id: f.item_id,
            qty: f.qty,
          }))
        )
      }

      return created
    })

    return NextResponse.json({ data: record, do_number }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
