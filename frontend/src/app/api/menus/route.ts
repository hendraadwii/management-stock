import { NextRequest, NextResponse } from "next/server"
import { asc } from "drizzle-orm"
import { db } from "@/db"
import { menus } from "@/db/schema"
import { requireUser, requireAdmin } from "@/lib/auth"
import { handleError } from "@/lib/api-helpers"

export async function GET() {
  try {
    await requireUser()
    const data = await db
      .select()
      .from(menus)
      .orderBy(asc(menus.sort_order), asc(menus.name))
    return NextResponse.json({ data })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const name = String(body?.name ?? "").trim()

    if (!name) {
      return NextResponse.json({ error: "Nama menu harus diisi" }, { status: 400 })
    }

    const [created] = await db
      .insert(menus)
      .values({
        name,
        url: body?.url?.trim() || null,
        icon: body?.icon || null,
        parent_id: body?.parent_id || null,
        sort_order: parseInt(String(body?.sort_order ?? "0"), 10) || 0,
      })
      .$returningId()

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
