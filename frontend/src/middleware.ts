import { type NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/session"

export async function middleware(request: NextRequest) {
  const user = await getSessionFromRequest(request)
  const { pathname } = request.nextUrl

  // Public routes
  if (pathname === "/login" || pathname === "/api/auth/login") {
    if (pathname === "/login" && user) {
      const url = request.nextUrl.clone()
      url.pathname = user.role === "user" ? "/transactions/stock" : "/dashboard"
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Protected routes - require auth
  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Role-based access control
  if (user.role === "user" && !pathname.startsWith("/transactions") && pathname !== "/") {
    const url = request.nextUrl.clone()
    url.pathname = "/transactions/stock"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
