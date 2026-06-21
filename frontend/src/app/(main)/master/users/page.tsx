"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { User, RoleRecord } from "@/types"
import { DataTable } from "@/components/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [allRoles, setAllRoles] = useState<RoleRecord[]>([])
  const supabase = createClient()

  const fetchUsers = async () => {
    const { data } = await supabase.from("users").select("*").order("username")
    if (data) {
      const usersWithRoles = await Promise.all(
        data.map(async (u) => {
          const { data: roleRecords } = await supabase
            .from("user_roles")
            .select("role_name")
            .eq("user_id", u.id)
          return {
            ...u,
            roles: roleRecords?.map(r => r.role_name) || [u.role],
          } as User
        })
      )
      setUsers(usersWithRoles)
    }
    setLoading(false)
  }

  const fetchRoles = async () => {
    const { data } = await supabase.from("roles").select("*").order("name")
    if (data) setAllRoles(data)
  }

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [supabase])

  const resetForm = () => {
    setUsername("")
    setPassword("")
    setSelectedRoles([])
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
        role: selectedRoles[0] || "user",
      }
      if (password.trim()) {
        payload.password = password.trim()
      }

      const { error } = await supabase
        .from("users")
        .update(payload)
        .eq("id", editItem.id)

      if (error) {
        toast.error("Gagal mengupdate user")
        return
      }

      await supabase.from("user_roles").delete().eq("user_id", editItem.id)

      if (selectedRoles.length > 0) {
        const { error: roleError } = await supabase.from("user_roles").insert(
          selectedRoles.map((r) => ({
            user_id: editItem.id,
            role_name: r,
          }))
        )
        if (roleError) {
          toast.error("Gagal menyimpan role user")
          return
        }
      }

      toast.success("User berhasil diupdate")
    } else {
      if (!password.trim()) {
        toast.error("Password harus diisi")
        return
      }

      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("username", username.trim())
        .limit(1)

      if (existingUser && existingUser.length > 0) {
        toast.error("Username sudah digunakan")
        return
      }

      const { data: newUser, error } = await supabase
        .from("users")
        .insert({
          username: username.trim(),
          password: password.trim(),
          role: selectedRoles[0] || "user",
        })
        .select()
        .single()

      if (error || !newUser) {
        toast.error("Gagal membuat user")
        return
      }

      if (selectedRoles.length > 0) {
        const { error: roleError } = await supabase.from("user_roles").insert(
          selectedRoles.map((r) => ({
            user_id: newUser.id,
            role_name: r,
          }))
        )
        if (roleError) {
          toast.error("Gagal menyimpan role user")
          return
        }
      }

      toast.success("User berhasil dibuat")
    }

    setOpen(false)
    resetForm()
    fetchUsers()
  }

  const handleEdit = async (item: User) => {
    setEditItem(item)
    setUsername(item.username)
    setPassword("")
    setSelectedRoles(item.roles || [item.role])
    setOpen(true)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("users").delete().eq("id", id)

    if (error) {
      toast.error("Gagal menghapus user")
      return
    }
    toast.success("User berhasil dihapus")
    fetchUsers()
  }

  const toggleRole = (roleName: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName)
        ? prev.filter((r) => r !== roleName)
        : [...prev, roleName]
    )
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
        <div className="flex flex-wrap gap-1">
          {(row.original.roles || [row.original.role]).map((r) => (
            <Badge
              key={r}
              variant={r === "admin" ? "default" : "secondary"}
              className="capitalize"
            >
              {r === "admin" ? (
                <Shield className="mr-1 h-3 w-3" />
              ) : (
                <UserIcon className="mr-1 h-3 w-3" />
              )}
              {r}
            </Badge>
          ))}
        </div>
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
                <Label>Role</Label>
                <div className="space-y-2 rounded-md border p-3">
                  {allRoles.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Belum ada role. Tambah role di Master Role terlebih dahulu.
                    </p>
                  )}
                  {allRoles.map((r) => (
                    <Label
                      key={r.id}
                      className="flex items-center gap-2 text-sm font-normal"
                    >
                      <Checkbox
                        checked={selectedRoles.includes(r.name)}
                        onCheckedChange={() => toggleRole(r.name)}
                      />
                      {r.name}
                      {r.name === "admin" && (
                        <Shield className="h-3 w-3 text-primary" />
                      )}
                    </Label>
                  ))}
                </div>
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
