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
import { Warehouse } from "lucide-react"
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
      .from("users")
      .select("*")
      .eq("username", username.trim())
      .maybeSingle()

    if (error || !user || user.password !== password.trim()) {
      toast.error("Username atau password salah")
      setLoading(false)
      return
    }

    const { data: roleRecords } = await supabase
      .from("user_roles")
      .select("role_name")
      .eq("user_id", user.id)

    const userRoles = roleRecords?.map(r => r.role_name) || [user.role]

    signIn({
      id: user.id,
      username: user.username,
      role: user.role,
      roles: userRoles,
      created_at: user.created_at,
    })

    toast.success("Login berhasil")
    router.push("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-primary/10 p-3">
              <Warehouse className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl">Stock Management</CardTitle>
          <CardDescription>Silakan login untuk melanjutkan</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
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
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
