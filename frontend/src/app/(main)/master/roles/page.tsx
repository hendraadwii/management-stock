"use client"

import { useEffect, useState } from "react"
import { apiGet, apiMutate } from "@/lib/api"
import { RoleRecord as Role, Menu } from "@/types"
import { DataTable } from "@/components/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getIcon } from "@/lib/icon-map"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Key } from "lucide-react"
import { toast } from "sonner"

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"edit" | "delete" | null>(null)
  const [pendingRole, setPendingRole] = useState<Role | null>(null)
  const [editItem, setEditItem] = useState<Role | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  // State untuk Hak Akses Menu
  const [accessDialogOpen, setAccessDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [menus, setMenus] = useState<Menu[]>([])
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([])
  const [savingAccess, setSavingAccess] = useState(false)

  const handleOpenAccess = async (role: Role) => {
    setSelectedRole(role)
    setAccessDialogOpen(true)

    try {
      const [menusRes, roleRes] = await Promise.all([
        apiGet<{ data: Menu[] }>("/api/menus"),
        apiGet<{ data: Role[] }>(`/api/roles`),
      ])

      if (menusRes.data) setMenus(menusRes.data)

      const currentRole = roleRes.data.find((r) => r.id === role.id)
      setSelectedMenuIds(
        Array.isArray(currentRole?.access_menus) ? currentRole!.access_menus! : []
      )
    } catch {}
  }

  const handleToggleMenu = (menuId: string, checked: boolean) => {
    if (checked) {
      setSelectedMenuIds((prev) => [...prev, menuId])
    } else {
      setSelectedMenuIds((prev) => prev.filter((id) => id !== menuId))
    }
  }

  const handleSaveAccess = async () => {
    if (!selectedRole) return
    setSavingAccess(true)

    try {
      await apiMutate(`/api/roles/${selectedRole.id}`, "PATCH", {
        access_menus: selectedMenuIds,
      })
      toast.success("Hak akses berhasil diperbarui")
      setAccessDialogOpen(false)
    } catch (error: any) {
      toast.error(error.message || "Gagal memperbarui hak akses")
    } finally {
      setSavingAccess(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const { data } = await apiGet<{ data: Role[] }>("/api/roles")
      setRoles(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Nama role harus diisi")
      return
    }

    if (editItem) {
      try {
        await apiMutate(`/api/roles/${editItem.id}`, "PATCH", {
          name: name.trim(),
          description: description.trim() || null,
        })
        toast.success("Role berhasil diupdate")
      } catch (error: any) {
        toast.error(error.message || "Gagal mengupdate role")
        return
      }
    } else {
      try {
        await apiMutate("/api/roles", "POST", {
          name: name.trim(),
          description: description.trim() || null,
        })
        toast.success("Role berhasil ditambah")
      } catch (error: any) {
        toast.error(error.message || "Gagal menambah role")
        return
      }
    }

    setOpen(false)
    setName("")
    setDescription("")
    setEditItem(null)
    fetchRoles()
  }

  const handleEdit = (item: Role) => {
    setPendingRole(item)
    setConfirmAction("edit")
    setConfirmOpen(true)
  }

  const confirmActionHandler = () => {
    if (!pendingRole || !confirmAction) return

    if (confirmAction === "edit") {
      setEditItem(pendingRole)
      setName(pendingRole.name)
      setDescription(pendingRole.description ?? "")
      setOpen(true)
    } else {
      handleDelete(pendingRole.id)
    }

    setConfirmOpen(false)
    setConfirmAction(null)
    setPendingRole(null)
  }

  const handleDelete = async (id: string) => {
    try {
      await apiMutate(`/api/roles/${id}`, "DELETE")
      toast.success("Role berhasil dihapus")
      fetchRoles()
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus role")
    }
  }

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: "name",
      header: "Nama Role",
    },
    {
      accessorKey: "description",
      header: "Deskripsi",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenAccess(row.original)}
            title="Kelola Hak Akses"
          >
            <Key className="h-4 w-4 text-primary" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(row.original)}
            title="Edit Role"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setPendingRole(row.original)
              setConfirmAction("delete")
              setConfirmOpen(true)
            }}
            title="Hapus Role"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Master Role</h1>
          <p className="text-sm text-muted-foreground">
            Kelola role / hak akses pengguna
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) {
              setName("")
              setDescription("")
              setEditItem(null)
            }
          }}
        >
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Role
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editItem ? "Edit Role" : "Tambah Role"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Role</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: manager, staff"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi role"
                />
              </div>
              <Button type="submit" className="w-full">
                {editItem ? "Update" : "Simpan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) {
            setConfirmAction(null)
            setPendingRole(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "edit" ? "Konfirmasi Edit" : "Konfirmasi Hapus"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "edit"
                ? `Anda yakin ingin mengedit role ${pendingRole?.name}?`
                : `Anda yakin ingin menghapus role ${pendingRole?.name}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Batal
            </Button>
            <Button
              variant={confirmAction === "delete" ? "destructive" : "default"}
              onClick={confirmActionHandler}
            >
              {confirmAction === "delete" ? "Hapus" : "Ya, Edit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DataTable
        columns={columns}
        data={roles}
        searchKey="name"
        searchPlaceholder="Cari role..."
      />

      {/* Dialog Kelola Hak Akses Menu */}
      <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Kelola Akses Menu - {selectedRole?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Pilih menu yang dapat diakses oleh role ini:
            </p>
            <ScrollArea className="h-[300px] pr-4 border rounded-md p-3">
              <div className="space-y-3">
                {menus.filter((m) => !m.parent_id).map((parent) => {
                  const children = menus.filter((m) => m.parent_id === parent.id)
                  return (
                    <div key={parent.id} className="space-y-2 border-b pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`menu-${parent.id}`}
                          checked={selectedMenuIds.includes(parent.id)}
                          onCheckedChange={(checked) => handleToggleMenu(parent.id, !!checked)}
                        />
                        <Label
                          htmlFor={`menu-${parent.id}`}
                          className="flex items-center gap-2 font-medium cursor-pointer text-sm"
                        >
                          {getIcon(parent.icon)}
                          {parent.name}
                        </Label>
                      </div>
                      {children.length > 0 && (
                        <div className="pl-6 space-y-2 border-l ml-2 pt-1">
                          {children.map((child) => (
                            <div key={child.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`menu-${child.id}`}
                                checked={selectedMenuIds.includes(child.id)}
                                onCheckedChange={(checked) => handleToggleMenu(child.id, !!checked)}
                              />
                              <Label
                                htmlFor={`menu-${child.id}`}
                                className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {getIcon(child.icon)}
                                {child.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
            <Button
              onClick={handleSaveAccess}
              className="w-full"
              disabled={savingAccess}
            >
              {savingAccess ? "Menyimpan..." : "Simpan Hak Akses"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
