import { NextRequest, NextResponse } from "next/server"
import { asc } from "drizzle-orm"
import { db } from "@/db"
import { roles } from "@/db/schema"
import { requireUser, requireAdmin } from "@/lib/auth"
import { handleError } from "@/lib/api-helpers"

export async function GET() {
  try {
    await requireUser()
    const data = await db.select().from(roles).orderBy(asc(roles.name))
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
      return NextResponse.json({ error: "Nama role harus diisi" }, { status: 400 })
    }

    const [created] = await db
      .insert(roles)
      .values({ name, description: body?.description?.trim() || null })
      .$returningId()

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
