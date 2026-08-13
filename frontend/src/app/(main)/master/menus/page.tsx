"use client"

import { useEffect, useState, Fragment } from "react"
import { apiGet, apiMutate } from "@/lib/api"
import { Menu } from "@/types"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, ChevronRight } from "lucide-react"
import { toast } from "sonner"

const ICON_OPTIONS = [
  "LayoutDashboard", "Package", "Tags", "Rows3", "Users",
  "ArrowRightLeft", "ClipboardList", "Truck", "FileText",
  "History", "Settings", "Folder", "Menu", "Shield", "Boxes",
]

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"edit" | "delete" | null>(null)
  const [pendingMenu, setPendingMenu] = useState<Menu | null>(null)
  const [editItem, setEditItem] = useState<Menu | null>(null)
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [icon, setIcon] = useState("")
  const [parentId, setParentId] = useState("")
  const [sortOrder, setSortOrder] = useState("0")

  const fetchMenus = async () => {
    try {
      const { data } = await apiGet<{ data: Menu[] }>("/api/menus")
      setMenus(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMenus()
  }, [])

  const topMenus = menus.filter((m) => !m.parent_id)
  const getChildren = (parentId: string) =>
    menus.filter((m) => m.parent_id === parentId)

  const resetForm = () => {
    setName("")
    setUrl("")
    setIcon("")
    setParentId("")
    setSortOrder("0")
    setEditItem(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Nama menu harus diisi")
      return
    }

    const payload = {
      name: name.trim(),
      url: url.trim() || null,
      icon: icon || null,
      parent_id: parentId || null,
      sort_order: parseInt(sortOrder) || 0,
    }

    if (editItem) {
      try {
        await apiMutate(`/api/menus/${editItem.id}`, "PATCH", payload)
        toast.success("Menu berhasil diupdate")
      } catch (error: any) {
        toast.error(error.message || "Gagal mengupdate menu")
        return
      }
    } else {
      try {
        await apiMutate("/api/menus", "POST", payload)
        toast.success("Menu berhasil ditambah")
      } catch (error: any) {
        toast.error(error.message || "Gagal menambah menu")
        return
      }
    }

    setOpen(false)
    resetForm()
    fetchMenus()
  }

  const handleEdit = (item: Menu) => {
    setPendingMenu(item)
    setConfirmAction("edit")
    setConfirmOpen(true)
  }

  const confirmActionHandler = () => {
    if (!pendingMenu || !confirmAction) return

    if (confirmAction === "edit") {
      setEditItem(pendingMenu)
      setName(pendingMenu.name)
      setUrl(pendingMenu.url ?? "")
      setIcon(pendingMenu.icon ?? "")
      setParentId(pendingMenu.parent_id ?? "")
      setSortOrder(String(pendingMenu.sort_order))
      setOpen(true)
    } else {
      handleDelete(pendingMenu.id)
    }

    setConfirmOpen(false)
    setConfirmAction(null)
    setPendingMenu(null)
  }

  const handleDelete = async (id: string) => {
    const children = getChildren(id)
    if (children.length > 0) {
      const childNames = children.map((c) => c.name).join(", ")
      toast.error(`Hapus sub-menu berikut terlebih dahulu: ${childNames}`)
      return
    }

    try {
      await apiMutate(`/api/menus/${id}`, "DELETE")
      toast.success("Menu berhasil dihapus")
      fetchMenus()
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus menu")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Master Menu</h1>
          <p className="text-sm text-muted-foreground">
            Kelola struktur menu navigasi
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) resetForm()
          }}
        >
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Menu
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editItem ? "Edit Menu" : "Tambah Menu"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Menu</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama menu"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL (kosongkan jika parent menu)</Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Contoh: /master/kategori"
                />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select value={icon} onValueChange={(v) => v && setIcon(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parent Menu (kosongkan untuk menu utama)</Label>
                <Select
                  value={parentId}
                  onValueChange={(v) => v && setParentId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih parent (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-- Menu Utama --</SelectItem>
                    {menus.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Urutan</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
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
            setPendingMenu(null)
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
                ? `Anda yakin ingin mengedit menu ${pendingMenu?.name}?`
                : `Anda yakin ingin menghapus menu ${pendingMenu?.name}?`}
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

      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Menu</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead>Urutan</TableHead>
              <TableHead className="w-24">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topMenus.map((menu) => (
              <Fragment key={menu.id}>
                <TableRow key={menu.id} className="bg-muted/50 font-medium">
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>{menu.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {menu.url || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{menu.icon || "-"}</Badge>
                  </TableCell>
                  <TableCell>{menu.sort_order}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(menu)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setPendingMenu(menu)
                          setConfirmAction("delete")
                          setConfirmOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {getChildren(menu.id).map((child) => (
                  <TableRow key={child.id}>
                    <TableCell></TableCell>
                    <TableCell className="pl-10">{child.name}</TableCell>
                    <TableCell>{child.url || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{child.icon || "-"}</Badge>
                    </TableCell>
                    <TableCell>{child.sort_order}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(child)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setPendingMenu(child)
                            setConfirmAction("delete")
                            setConfirmOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
            {topMenus.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Belum ada menu. Tambah menu baru.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
