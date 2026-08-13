import { NextResponse } from "next/server"
import { AuthError, ForbiddenError } from "@/lib/auth"

export function handleError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error("API error:", error)
  return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
}

export function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  }
  return []
}
