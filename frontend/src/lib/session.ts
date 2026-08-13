import { SignJWT, jwtVerify } from "jose"
import { NextRequest } from "next/server"

export const SESSION_COOKIE = "session"
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

const secret = new TextEncoder().encode(process.env.SESSION_SECRET)

export interface SessionUser {
  id: string
  username: string
  role: string
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret)
}

export async function verifySessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    if (!payload.id || !payload.username || !payload.role) return null
    return {
      id: payload.id as string,
      username: payload.username as string,
      role: payload.role as string,
    }
  } catch {
    return null
  }
}

export async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}
