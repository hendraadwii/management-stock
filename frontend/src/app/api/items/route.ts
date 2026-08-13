import { NextRequest, NextResponse } from "next/server"
import { asc, eq } from "drizzle-orm"
import { db } from "@/db"
import { items } from "@/db/schema"
import { requireUser, requireAdmin } from "@/lib/auth"
import { handleError } from "@/lib/api-helpers"

export async function GET() {
  try {
    await requireUser()
    const data = await db.select().from(items).orderBy(asc(items.part_number))
    return NextResponse.json({ data })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const part_number = String(body?.part_number ?? "").trim()

    if (!part_number) {
      return NextResponse.json({ error: "Part Number harus diisi" }, { status: 400 })
    }

    const [existing] = await db
      .select({ id: items.id })
      .from(items)
      .where(eq(items.part_number, part_number))
      .limit(1)

    if (existing) {
      return NextResponse.json({ error: "Part Number sudah digunakan" }, { status: 409 })
    }

    const [created] = await db
      .insert(items)
      .values({
        part_number,
        category: body?.category?.trim() || null,
        rack: body?.rack?.trim() || null,
        uom: body?.uom || null,
        standar_qty:
          body?.standar_qty != null && body.standar_qty !== ""
            ? String(body.standar_qty)
            : null,
      })
      .$returningId()

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
