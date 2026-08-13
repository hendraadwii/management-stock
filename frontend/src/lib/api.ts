export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || "Request gagal")
  return data as T
}

export async function apiMutate<T = { ok: true }>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || "Request gagal")
  return data as T
}
