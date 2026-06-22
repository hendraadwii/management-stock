"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { Item } from "@/types"
import { DataTable } from "@/components/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, Pencil, Package } from "lucide-react"
import { toast } from "sonner"

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
  const [editConfirmOpen, setEditConfirmOpen] = useState(false)
  const [pendingEditItem, setPendingEditItem] = useState<Item | null>(null)
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [partNumber, setPartNumber] = useState("")
  const [category, setCategory] = useState("")
  const [rack, setRack] = useState("")
  const supabase = useMemo(() => createClient(), [])

  const fetchItems = async () => {
    const { data } = await supabase
      .from("mst_items")
      .select("*")
      .order("part_number")
    if (data) {
      setItems(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const resetForm = () => {
    setPartNumber("")
    setCategory("")
    setRack("")
    setEditItem(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!partNumber.trim()) {
      toast.error("Part Number harus diisi")
      return
    }

    if (editItem) {
      const { error } = await supabase
        .from("mst_items")
        .update({
          part_number: partNumber.trim(),
          category: category.trim() || null,
          rack: rack.trim() || null,
        })
        .eq("id", editItem.id)

      if (error) {
        toast.error("Gagal mengupdate item")
        return
      }

      toast.success("Item berhasil diupdate")
    } else {
      const { data: existingItem } = await supabase
        .from("mst_items")
        .select("id")
        .eq("part_number", partNumber.trim())
        .limit(1)

      if (existingItem && existingItem.length > 0) {
        toast.error("Part Number sudah digunakan")
        return
      }

      const { error } = await supabase.from("mst_items").insert({
        part_number: partNumber.trim(),
        category: category.trim() || null,
        rack: rack.trim() || null,
      })

      if (error) {
        toast.error("Gagal membuat item")
        return
      }

      toast.success("Item berhasil dibuat")
    }

    setOpen(false)
    resetForm()
    fetchItems()
  }

  const handleEdit = (item: Item) => {
    setPendingEditItem(item)
    setEditConfirmOpen(true)
  }

  const confirmEdit = () => {
    if (!pendingEditItem) return

    setEditItem(pendingEditItem)
    setPartNumber(pendingEditItem.part_number)
    setCategory(pendingEditItem.category ?? "")
    setRack(pendingEditItem.rack ?? "")
    setEditConfirmOpen(false)
    setPendingEditItem(null)
    setOpen(true)
  }

  const confirmDelete = (item: Item) => {
    setDeleteTarget(item)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    const { count: stockCount } = await supabase
      .from("trx_stock")
      .select("*", { count: "exact", head: true })
      .eq("item_id", deleteTarget.id)

    const { count: doCount } = await supabase
      .from("delivery_order_details")
      .select("*", { count: "exact", head: true })
      .eq("item_id", deleteTarget.id)

    if ((stockCount ?? 0) > 0 || (doCount ?? 0) > 0) {
      const reasons: string[] = []
      if ((stockCount ?? 0) > 0) reasons.push("Stock")
      if ((doCount ?? 0) > 0) reasons.push("Delivery Order")
      toast.error(
        `Item tidak bisa dihapus karena masih memiliki data di ${reasons.join(" & ")}`
      )
      setDeleteTarget(null)
      return
    }

    const { error } = await supabase
      .from("mst_items")
      .delete()
      .eq("id", deleteTarget.id)

    if (error) {
      toast.error("Gagal menghapus item")
      setDeleteTarget(null)
      return
    }

    toast.success("Item berhasil dihapus")
    setDeleteTarget(null)
    fetchItems()
  }

  const columns: ColumnDef<Item>[] = [
    {
      accessorKey: "part_number",
      header: "Part Number",
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => row.original.category ?? "-",
    },
    {
      accessorKey: "rack",
      header: "Rak",
      cell: ({ row }) => row.original.rack ?? "-",
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
            onClick={() => confirmDelete(row.original)}
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
          <h1 className="text-2xl font-semibold tracking-tight">
            Master Item
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola data barang
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
            Tambah Item
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editItem ? "Edit Item" : "Tambah Item"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="partNumber">Part Number</Label>
                <Input
                  id="partNumber"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="Masukkan part number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Masukkan kategori"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rack">Rak</Label>
                <Input
                  id="rack"
                  value={rack}
                  onChange={(e) => setRack(e.target.value)}
                  placeholder="Masukkan kode rak"
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
        open={editConfirmOpen}
        onOpenChange={(open) => {
          setEditConfirmOpen(open)
          if (!open) setPendingEditItem(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Edit</DialogTitle>
            <DialogDescription>
              Anda yakin ingin mengedit item{" "}
              <strong>{pendingEditItem?.part_number}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditConfirmOpen(false)
                setPendingEditItem(null)
              }}
            >
              Batal
            </Button>
            <Button onClick={confirmEdit}>Ya, Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus item{" "}
              <strong>{deleteTarget?.part_number}</strong>? Tindakan ini tidak
              dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DataTable
        columns={columns}
        data={items}
        searchKey="part_number"
        searchPlaceholder="Cari item..."
      />
    </div>
  )
}
