"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Item } from "@/types"
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
} from "@/components/ui/dialog"
import { DataTable } from "@/components/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { Plus, Trash2, Pencil, ArrowRightLeft } from "lucide-react"

interface StockInRecord {
  id: string
  item_id: string
  qty: number
  note: string | null
  created_at: string
  created_by: string
  items?: Item
}

export default function StockInPage() {
  const [items, setItems] = useState<Item[]>([])
  const [records, setRecords] = useState<StockInRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<StockInRecord | null>(null)
  const [selectedItem, setSelectedItem] = useState("")
  const [qty, setQty] = useState("")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()

  const fetchData = async () => {
    const { data: itemsData } = await supabase
      .from("items")
      .select("*")
      .order("part_number")

    const { data: recordsData } = await supabase
      .from("stock_in")
      .select("*, items(*)")
      .order("created_at", { ascending: false })
      .limit(50)

    if (itemsData) setItems(itemsData)
    if (recordsData) setRecords(recordsData as unknown as StockInRecord[])
  }

  useEffect(() => {
    fetchData()
  }, [supabase])

  const openNewDialog = () => {
    setEditRecord(null)
    setSelectedItem("")
    setQty("")
    setNote("")
    setDialogOpen(true)
  }

  const openEditDialog = () => {
    if (!selectedId) return
    const record = records.find((r) => r.id === selectedId)
    if (!record) return

    setEditRecord(record)
    setSelectedItem(record.item_id)
    setQty(String(record.qty))
    setNote(record.note || "")
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedId) return
    if (!confirm("Yakin ingin menghapus data stock masuk ini?")) return

    const record = records.find((r) => r.id === selectedId)
    if (!record) return

    const { data: itemData } = await supabase
      .from("items")
      .select("current_stock")
      .eq("id", record.item_id)
      .single()

    if (itemData) {
      const newStock = Math.max(0, itemData.current_stock - record.qty)
      await supabase
        .from("items")
        .update({ current_stock: newStock })
        .eq("id", record.item_id)
    }

    const { error } = await supabase
      .from("stock_in")
      .delete()
      .eq("id", selectedId)

    if (error) {
      toast.error("Gagal menghapus data stock masuk")
      return
    }

    await supabase
      .from("stock_movements")
      .delete()
      .eq("item_id", record.item_id)
      .eq("movement_type", "stock_in")
      .eq("qty", record.qty)
      .is("reference_number", null)

    toast.success("Data stock masuk berhasil dihapus")
    setSelectedId(null)
    fetchData()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedItem || !qty || parseInt(qty) <= 0) {
      toast.error("Pilih barang dan masukkan qty yang valid")
      return
    }

    setLoading(true)
    const qtyNum = parseInt(qty)

    if (editRecord) {
      const oldQty = editRecord.qty

      const { error } = await supabase
        .from("stock_in")
        .update({
          qty: qtyNum,
          note: note.trim() || null,
        })
        .eq("id", editRecord.id)

      if (error) {
        toast.error("Gagal mengupdate stock masuk")
        setLoading(false)
        return
      }

      const { data: itemData } = await supabase
        .from("items")
        .select("current_stock")
        .eq("id", selectedItem)
        .single()

      if (itemData) {
        const newStock = itemData.current_stock - oldQty + qtyNum
        await supabase
          .from("items")
          .update({ current_stock: newStock })
          .eq("id", selectedItem)
      }

      toast.success("Stock masuk berhasil diupdate")
    } else {
      const { error: stockInError } = await supabase
        .from("stock_in")
        .insert({
          item_id: selectedItem,
          qty: qtyNum,
          note: note.trim() || null,
          created_by: user?.id,
        })
        .select()
        .single()

      if (stockInError) {
        toast.error("Gagal mencatat stock masuk")
        setLoading(false)
        return
      }

      const { data: currentItem } = await supabase
        .from("items")
        .select("current_stock")
        .eq("id", selectedItem)
        .single()

      if (currentItem) {
        const newStock = currentItem.current_stock + qtyNum
        await supabase
          .from("items")
          .update({ current_stock: newStock })
          .eq("id", selectedItem)
      }

      await supabase.from("stock_movements").insert({
        item_id: selectedItem,
        movement_type: "stock_in",
        qty: qtyNum,
        reference_number: `SI-${Date.now()}`,
      })

      toast.success("Stock masuk berhasil dicatat")
    }

    setDialogOpen(false)
    setSelectedItem("")
    setQty("")
    setNote("")
    setEditRecord(null)
    setLoading(false)
    fetchData()
  }

  const columns: ColumnDef<StockInRecord>[] = [
    {
      id: "select",
      header: "",
      cell: ({ row }) => (
        <input
          type="radio"
          name="stockin-select"
          className="h-4 w-4 cursor-pointer"
          checked={selectedId === row.original.id}
          onChange={() => setSelectedId(row.original.id)}
        />
      ),
    },
    {
      accessorKey: "created_at",
      header: "Tanggal",
      cell: ({ row }) =>
        new Date(row.original.created_at).toLocaleDateString("id-ID"),
    },
    {
      accessorKey: "items.part_number",
      header: "Part Number",
      cell: ({ row }) => row.original.items?.part_number ?? "-",
    },
    {
      accessorKey: "items.item_name",
      header: "Nama Barang",
      cell: ({ row }) => row.original.items?.item_name ?? "-",
    },
    {
      accessorKey: "qty",
      header: "Qty Masuk",
    },
    {
      accessorKey: "note",
      header: "Keterangan",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Stock Masuk
          </h1>
          <p className="text-sm text-muted-foreground">
            Catat barang masuk ke gudang
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openNewDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Data
          </Button>
          <Button
            variant="outline"
            disabled={!selectedId}
            onClick={openEditDialog}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Data
          </Button>
          <Button
            variant="destructive"
            disabled={!selectedId}
            onClick={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Data
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={records}
        searchKey="items.part_number"
        searchPlaceholder="Cari part number..."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-w-full max-h-[90dvh] p-4 sm:p-6 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 shrink-0" />
              <span className="truncate">
                {editRecord ? "Edit Stock Masuk" : "New Stock Masuk"}
              </span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Pilih Barang</Label>
              <Select
                value={selectedItem}
                onValueChange={(v) => v && setSelectedItem(v)}
                disabled={!!editRecord}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Cari & pilih barang...">
                    {(() => {
                      const sel = items.find(i => i.id === selectedItem)
                      return sel ? `${sel.part_number} - ${sel.item_name}` : null
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      <span className="truncate">{item.part_number} - {item.item_name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="qty">Qty Masuk</Label>
                <Input
                  id="qty"
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="Jumlah barang masuk"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Keterangan (Optional)</Label>
                <Input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Catatan tambahan"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Menyimpan..."
                : editRecord
                  ? "Update"
                  : "Simpan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
