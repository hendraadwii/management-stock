import "server-only"
import { cookies } from "next/headers"
import { SESSION_COOKIE, verifySessionToken, SessionUser } from "@/lib/session"

export class AuthError extends Error {
  status = 401
}

export class ForbiddenError extends Error {
  status = 403
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new AuthError("Unauthorized")
  return user
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== "admin") throw new ForbiddenError("Forbidden")
  return user
}
