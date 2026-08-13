import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { roles } from "@/db/schema"
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

    const payload: Record<string, unknown> = {}

    if (body?.name !== undefined) {
      payload.name = String(body.name).trim()
    }
    if (body?.description !== undefined) {
      payload.description = body.description?.trim() || null
    }
    if (body?.access_menus !== undefined) {
      payload.access_menus = Array.isArray(body.access_menus) ? body.access_menus : []
    }

    await db.update(roles).set(payload).where(eq(roles.id, id))
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
    await db.delete(roles).where(eq(roles.id, id))
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
