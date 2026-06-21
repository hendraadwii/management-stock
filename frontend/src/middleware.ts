import { type NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get("auth")?.value
  const { pathname } = request.nextUrl

  if (!authCookie && pathname !== "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (authCookie && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  if (authCookie) {
    try {
      JSON.parse(atob(authCookie))
    } catch {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
