import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const username = String(body?.username ?? "").trim()
    const password = String(body?.password ?? "")

    if (!username || !password) {
      return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 })
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1)

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: "Username atau password salah" }, { status: 401 })
    }

    const token = await createSessionToken({
      id: user.id,
      username: user.username,
      role: user.role,
    })

    const response = NextResponse.json({
      id: user.id,
      username: user.username,
      role: user.role,
      created_at: user.created_at,
    })

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
