"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { signIn } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Query ke tabel users di Supabase
    const { data: user, error } = await supabase
      .from("mst_users")
      .select("*")
      .eq("username", username.trim())
      .maybeSingle()

    if (error || !user || user.password !== password.trim()) {
      toast.error("Username atau password salah")
      setLoading(false)
      return
    }

    signIn({
      id: user.id,
      username: user.username,
      role: user.role,
      created_at: user.created_at,
    })

    toast.success("Login berhasil")
    router.push(user.role === "user" ? "/transactions/stock" : "/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-3 py-6 sm:px-4">
      <Card className="w-full max-w-sm shadow-sm sm:max-w-md">
        <CardHeader className="space-y-2 px-5 pb-4 pt-6 text-center sm:px-6">
          <CardTitle className="text-2xl font-semibold tracking-tight">Stock Management</CardTitle>
          <CardDescription className="text-sm">Silakan login untuk melanjutkan</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-6 sm:px-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                className="h-11"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                className="h-11"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? "Loading..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
