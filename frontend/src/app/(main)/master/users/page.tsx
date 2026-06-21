"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { User, RoleRecord } from "@/types"
import { DataTable } from "@/components/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, Pencil, Shield, UserIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editItem, setEditItem] = useState<User | null>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("")
  const [allRoles, setAllRoles] = useState<RoleRecord[]>([])
  const supabase = createClient()

  const fetchUsers = async () => {
    const { data } = await supabase.from("mst_users").select("*").order("username")
    if (data) {
      setUsers(data)
    }
    setLoading(false)
  }

  const fetchRoles = async () => {
    const { data } = await supabase.from("mst_roles").select("*").order("name")
    if (data) setAllRoles(data)
  }

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [supabase])

  const resetForm = () => {
    setUsername("")
    setPassword("")
    setRole("")
    setEditItem(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim()) {
      toast.error("Username harus diisi")
      return
    }

    if (editItem) {
      const payload: Record<string, string> = {
        username: username.trim(),
        role: role || "user",
      }
      if (password.trim()) {
        payload.password = password.trim()
      }

      const { error } = await supabase
        .from("mst_users")
        .update(payload)
        .eq("id", editItem.id)

      if (error) {
        toast.error("Gagal mengupdate user")
        return
      }

      toast.success("User berhasil diupdate")
    } else {
      if (!password.trim()) {
        toast.error("Password harus diisi")
        return
      }

      const { data: existingUser } = await supabase
        .from("mst_users")
        .select("id")
        .eq("username", username.trim())
        .limit(1)

      if (existingUser && existingUser.length > 0) {
        toast.error("Username sudah digunakan")
        return
      }

      const { data: newUser, error } = await supabase
        .from("mst_users")
        .insert({
          username: username.trim(),
          password: password.trim(),
          role: role || "user",
        })
        .select()
        .single()

      if (error || !newUser) {
        toast.error("Gagal membuat user")
        return
      }

      toast.success("User berhasil dibuat")
    }

    setOpen(false)
    resetForm()
    fetchUsers()
  }

  const handleEdit = async (item: User) => {
    if (!confirm("Yakin ingin mengedit user ini?")) return
    setEditItem(item)
    setUsername(item.username)
    setPassword("")
    setRole(item.role)
    setOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus user ini?")) return
    const { error } = await supabase.from("mst_users").delete().eq("id", id)

    if (error) {
      toast.error("Gagal menghapus user")
      return
    }
    toast.success("User berhasil dihapus")
    fetchUsers()
  }

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "username",
      header: "Username",
    },
    {
      id: "roles",
      header: "Role",
      cell: ({ row }) => (
        <Badge
          variant={row.original.role === "admin" ? "default" : "secondary"}
          className="capitalize"
        >
          {row.original.role === "admin" ? (
            <Shield className="mr-1 h-3 w-3" />
          ) : (
            <UserIcon className="mr-1 h-3 w-3" />
          )}
          {row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      cell: ({ row }) =>
        new Date(row.original.created_at).toLocaleDateString("id-ID"),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Master User
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola data pengguna sistem
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button
                onClick={() => {
                  resetForm()
                }}
              />
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah User
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editItem ? "Edit User" : "Tambah User"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {editItem && "(kosongkan jika tidak diubah)"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    editItem
                      ? "Biarkan kosong jika tidak diubah"
                      : "Masukkan password"
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(v) => v && setRole(v)}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    {allRoles.length === 0 && (
                      <SelectItem value="" disabled>
                        Belum ada role
                      </SelectItem>
                    )}
                    {allRoles.map((r) => (
                      <SelectItem key={r.id} value={r.name}>
                        <span className="flex items-center gap-2">
                          {r.name === "admin" && <Shield className="h-3 w-3 text-primary" />}
                          {r.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                {editItem ? "Update" : "Simpan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable
        columns={columns}
        data={users}
        searchKey="username"
        searchPlaceholder="Cari user..."
      />
    </div>
  )
}
