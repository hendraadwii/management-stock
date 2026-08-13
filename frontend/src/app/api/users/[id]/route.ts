import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { db } from "@/db"
import { users } from "@/db/schema"
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
    const username = String(body?.username ?? "").trim()
    const role = String(body?.role ?? "user").trim() || "user"

    if (!username) {
      return NextResponse.json({ error: "Username harus diisi" }, { status: 400 })
    }

    const [duplicate] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1)

    if (duplicate && duplicate.id !== id) {
      return NextResponse.json({ error: "Username sudah digunakan" }, { status: 409 })
    }

    const payload: { username: string; role: string; password?: string } = { username, role }
    if (body?.password && String(body.password).trim()) {
      payload.password = await bcrypt.hash(String(body.password).trim(), 10)
    }

    await db.update(users).set(payload).where(eq(users.id, id))
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
    await db.delete(users).where(eq(users.id, id))
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
