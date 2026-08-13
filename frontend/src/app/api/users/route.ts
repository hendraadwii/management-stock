import { NextRequest, NextResponse } from "next/server"
import { asc, eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { db } from "@/db"
import { users } from "@/db/schema"
import { requireAdmin } from "@/lib/auth"
import { handleError } from "@/lib/api-helpers"

export async function GET() {
  try {
    await requireAdmin()
    const data = await db
      .select({ id: users.id, username: users.username, role: users.role, created_at: users.created_at })
      .from(users)
      .orderBy(asc(users.username))
    return NextResponse.json({ data })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const username = String(body?.username ?? "").trim()
    const password = String(body?.password ?? "")
    const role = String(body?.role ?? "user").trim() || "user"

    if (!username) {
      return NextResponse.json({ error: "Username harus diisi" }, { status: 400 })
    }
    if (!password) {
      return NextResponse.json({ error: "Password harus diisi" }, { status: 400 })
    }

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1)

    if (existing) {
      return NextResponse.json({ error: "Username sudah digunakan" }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const [created] = await db
      .insert(users)
      .values({ username, password: hashedPassword, role })
      .$returningId()

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
