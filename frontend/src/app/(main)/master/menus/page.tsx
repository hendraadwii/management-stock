"use client"

import { useEffect, useState, Fragment } from "react"
import { createClient } from "@/lib/supabase"
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
  const [editItem, setEditItem] = useState<Menu | null>(null)
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [icon, setIcon] = useState("")
  const [parentId, setParentId] = useState("")
  const [sortOrder, setSortOrder] = useState("0")
  const supabase = createClient()

  const fetchMenus = async () => {
    const { data } = await supabase
      .from("menus")
      .select("*")
      .order("sort_order")
      .order("name")

    if (data) setMenus(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchMenus()
  }, [supabase])

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
      const { error } = await supabase
        .from("menus")
        .update(payload)
        .eq("id", editItem.id)

      if (error) {
        toast.error("Gagal mengupdate menu")
        return
      }
      toast.success("Menu berhasil diupdate")
    } else {
      const { error } = await supabase.from("menus").insert(payload)

      if (error) {
        toast.error("Gagal menambah menu")
        return
      }
      toast.success("Menu berhasil ditambah")
    }

    setOpen(false)
    resetForm()
    fetchMenus()
  }

  const handleEdit = (item: Menu) => {
    setEditItem(item)
    setName(item.name)
    setUrl(item.url ?? "")
    setIcon(item.icon ?? "")
    setParentId(item.parent_id ?? "")
    setSortOrder(String(item.sort_order))
    setOpen(true)
  }

  const handleDelete = async (id: string) => {
    const children = getChildren(id)
    if (children.length > 0) {
      const childNames = children.map((c) => c.name).join(", ")
      toast.error(`Hapus sub-menu berikut terlebih dahulu: ${childNames}`)
      return
    }

    const { error } = await supabase.from("menus").delete().eq("id", id)
    if (error) {
      toast.error("Gagal menghapus menu")
      return
    }
    toast.success("Menu berhasil dihapus")
    fetchMenus()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      <div className="rounded-md border">
        <Table>
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
                        onClick={() => handleDelete(menu.id)}
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
                          onClick={() => handleDelete(child.id)}
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
