"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
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
  const [editItem, setEditItem] = useState<Role | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const supabase = createClient()

  // State untuk Hak Akses Menu
  const [accessDialogOpen, setAccessDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [menus, setMenus] = useState<Menu[]>([])
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([])
  const [savingAccess, setSavingAccess] = useState(false)

  const handleOpenAccess = async (role: Role) => {
    setSelectedRole(role)
    setAccessDialogOpen(true)
    
    // Ambil semua menu
    const { data: allMenus } = await supabase
      .from("mst_menus")
      .select("*")
      .order("sort_order")
      .order("name")
      
    if (allMenus) setMenus(allMenus)

    // Ambil hak akses menu saat ini dari kolom access_menus pada role tersebut
    const { data: currentRole } = await supabase
      .from("mst_roles")
      .select("access_menus")
      .eq("id", role.id)
      .maybeSingle()
      
    if (currentRole?.access_menus) {
      setSelectedMenuIds(currentRole.access_menus)
    } else {
      setSelectedMenuIds([])
    }
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

    // Simpan array menuId langsung ke kolom access_menus pada tabel roles
    const { error } = await supabase
      .from("mst_roles")
      .update({
        access_menus: selectedMenuIds,
      })
      .eq("id", selectedRole.id)

    if (error) {
      toast.error("Gagal memperbarui hak akses")
      setSavingAccess(false)
      return
    }

    toast.success("Hak akses berhasil diperbarui")
    setAccessDialogOpen(false)
    setSavingAccess(false)
  }

  const fetchRoles = async () => {
    const { data } = await supabase.from("mst_roles").select("*").order("name")
    if (data) setRoles(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchRoles()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Nama role harus diisi")
      return
    }

    if (editItem) {
      const { error } = await supabase
        .from("mst_roles")
        .update({
          name: name.trim(),
          description: description.trim() || null,
        })
        .eq("id", editItem.id)

      if (error) {
        toast.error("Gagal mengupdate role")
        return
      }
      toast.success("Role berhasil diupdate")
    } else {
      const { error } = await supabase.from("mst_roles").insert({
        name: name.trim(),
        description: description.trim() || null,
      })

      if (error) {
        toast.error("Gagal menambah role")
        return
      }
      toast.success("Role berhasil ditambah")
    }

    setOpen(false)
    setName("")
    setDescription("")
    setEditItem(null)
    fetchRoles()
  }

  const handleEdit = (item: Role) => {
    if (!confirm("Yakin ingin mengedit role ini?")) return
    setEditItem(item)
    setName(item.name)
    setDescription(item.description ?? "")
    setOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus role ini?")) return
    const { error } = await supabase.from("mst_roles").delete().eq("id", id)

    if (error) {
      toast.error("Gagal menghapus role")
      return
    }
    toast.success("Role berhasil dihapus")
    fetchRoles()
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
            onClick={() => handleDelete(row.original.id)}
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
      <div className="flex items-center justify-between">
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
