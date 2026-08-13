import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { menus } from "@/db/schema"
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
    const name = String(body?.name ?? "").trim()

    if (!name) {
      return NextResponse.json({ error: "Nama menu harus diisi" }, { status: 400 })
    }

    await db
      .update(menus)
      .set({
        name,
        url: body?.url?.trim() || null,
        icon: body?.icon || null,
        parent_id: body?.parent_id || null,
        sort_order: parseInt(String(body?.sort_order ?? "0"), 10) || 0,
      })
      .where(eq(menus.id, id))

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

    const [child] = await db
      .select({ id: menus.id })
      .from(menus)
      .where(eq(menus.parent_id, id))
      .limit(1)

    if (child) {
      return NextResponse.json(
        { error: "Hapus sub-menu berikut terlebih dahulu" },
        { status: 409 }
      )
    }

    await db.delete(menus).where(eq(menus.id, id))
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
