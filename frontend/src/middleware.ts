import { type NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get("auth")?.value
  const { pathname } = request.nextUrl

  // Public routes
  if (pathname === "/login") {
    if (authCookie) {
      try {
        const authData = JSON.parse(atob(authCookie))
        const isUser = authData.role === "user"
        const url = request.nextUrl.clone()
        url.pathname = isUser ? "/transactions/stock" : "/dashboard"
        return NextResponse.redirect(url)
      } catch {
        // Invalid auth, redirect to login
        return NextResponse.next()
      }
    }
    return NextResponse.next()
  }

  // Protected routes - require auth
  if (!authCookie) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Role-based access control
  try {
    const authData = JSON.parse(atob(authCookie))
    const isUser = authData.role === "user"

    // Users can only access transactions routes
    if (isUser && !pathname.startsWith("/transactions") && pathname !== "/") {
      const url = request.nextUrl.clone()
      url.pathname = "/transactions/stock"
      return NextResponse.redirect(url)
    }
  } catch {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
