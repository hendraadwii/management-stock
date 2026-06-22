"use client"

import { useEffect, useState, useMemo } from "react"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTable } from "@/components/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { Plus, Trash2, Pencil, ArrowRightLeft, History } from "lucide-react"

interface StockInRecord {
  id: string
  item_id: string
  qty: number
  note: string | null
  created_at: string
  created_by: string
  items?: Item
}

interface GroupedItem {
  item: Item
  totalQty: number
}

export default function StockInPage() {
  const [items, setItems] = useState<Item[]>([])
  const [records, setRecords] = useState<StockInRecord[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<StockInRecord | null>(null)
  const [recordToDelete, setRecordToDelete] = useState<StockInRecord | null>(null)
  const [selectedItem, setSelectedItem] = useState("")
  const [qty, setQty] = useState("")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const fetchData = async () => {
    const { data: itemsData } = await supabase
      .from("mst_items")
      .select("*")
      .order("part_number")

    const { data: recordsData } = await supabase
      .from("trx_stock")
      .select("*")
      .order("created_at", { ascending: false })

    if (itemsData) setItems(itemsData)
    if (recordsData) {
      const mapped = recordsData.map((r: any) => ({
        ...r,
        items: itemsData?.find((i: any) => i.id === r.item_id) ?? null,
      }))
      setRecords(mapped as unknown as StockInRecord[])
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const groupedData = useMemo(() => {
    const map = new Map<string, GroupedItem>()
    for (const r of records) {
      const item = items.find((i) => i.id === r.item_id)
      if (!item) continue
      if (!map.has(item.id)) {
        map.set(item.id, { item, totalQty: 0 })
      }
      map.get(item.id)!.totalQty += r.qty
    }
    return Array.from(map.values()).sort((a, b) =>
      a.item.part_number.localeCompare(b.item.part_number)
    )
  }, [items, records])

  const selectedItemRecords = useMemo(() => {
    if (!selectedItemId) return []
    return records
      .filter((r) => r.item_id === selectedItemId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
  }, [selectedItemId, records])

  const openNewDialog = () => {
    setEditRecord(null)
    setSelectedItem("")
    setQty("")
    setNote("")
    setDialogOpen(true)
  }

  const openEditDialog = (record: StockInRecord) => {
    setEditRecord(record)
    setSelectedItem(record.item_id)
    setQty(String(record.qty))
    setNote(record.note || "")
    setDialogOpen(true)
  }

  const openDeleteDialog = (record: StockInRecord) => {
    setRecordToDelete(record)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!recordToDelete) return

    setDeleting(true)
    const record = recordToDelete

    try {
      const { data: itemData } = await supabase
        .from("mst_items")
        .select("current_stock")
        .eq("id", record.item_id)
        .single()

      if (itemData) {
        const newStock = Math.max(0, itemData.current_stock - record.qty)
        await supabase
          .from("mst_items")
          .update({ current_stock: newStock })
          .eq("id", record.item_id)
      }

      const { error } = await supabase
        .from("trx_stock")
        .delete()
        .eq("id", record.id)

      if (error) throw error

      toast.success("Data stock masuk berhasil dihapus")
      await fetchData()
    } catch (error) {
      toast.error("Gagal menghapus data stock masuk")
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setRecordToDelete(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedItem || !qty || parseInt(qty) <= 0) {
      toast.error("Pilih barang dan masukkan qty yang valid")
      return
    }

    setLoading(true)
    const qtyNum = parseInt(qty)
    const normalizedNote = note.trim() || null

    if (editRecord) {
      const oldQty = editRecord.qty

      const { error } = await supabase
        .from("trx_stock")
        .update({
          qty: qtyNum,
          note: normalizedNote,
        })
        .eq("id", editRecord.id)

      if (error) {
        toast.error("Gagal mengupdate stock masuk")
        setLoading(false)
        return
      }

      const { data: itemData } = await supabase
        .from("mst_items")
        .select("current_stock")
        .eq("id", selectedItem)
        .single()

      if (itemData) {
        const newStock = itemData.current_stock - oldQty + qtyNum
        await supabase
          .from("mst_items")
          .update({ current_stock: newStock })
          .eq("id", selectedItem)
      }

      toast.success("Stock masuk berhasil diupdate")
    } else {
      const { error: stockInError } = await supabase
        .from("trx_stock")
        .insert({
          item_id: selectedItem,
          qty: qtyNum,
          note: normalizedNote,
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
        .from("mst_items")
        .select("current_stock")
        .eq("id", selectedItem)
        .single()

      if (currentItem) {
        const newStock = currentItem.current_stock + qtyNum
        await supabase
          .from("mst_items")
          .update({ current_stock: newStock })
          .eq("id", selectedItem)
      }

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

  const columns: ColumnDef<GroupedItem>[] = [
    {
      id: "select",
      header: "",
      cell: ({ row }) => (
        <input
          type="radio"
          name="stockin-select"
          className="h-4 w-4 cursor-pointer"
          checked={selectedItemId === row.original.item.id}
          onChange={() => setSelectedItemId(row.original.item.id)}
        />
      ),
    },
    {
      accessorKey: "item.part_number",
      header: "Part Number",
      cell: ({ row }) => row.original.item.part_number,
    },
    {
      accessorKey: "item.category",
      header: "Category",
      cell: ({ row }) => row.original.item.category ?? "-",
    },
    {
      accessorKey: "item.rack",
      header: "Rak",
      cell: ({ row }) => row.original.item.rack ?? "-",
    },
    {
      id: "total_qty",
      header: "Total Qty Masuk",
      cell: ({ row }) => row.original.totalQty,
    },
    {
      id: "current_stock",
      header: "Current Stock",
      cell: ({ row }) => row.original.item.current_stock,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Stock Masuk
          </h1>
          <p className="text-sm text-muted-foreground">
            Catat barang masuk ke gudang
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openNewDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Data
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={groupedData}
        searchKey="item.part_number"
        searchPlaceholder="Cari part number..."
      />

      {selectedItemId && (() => {
        const item = items.find((i) => i.id === selectedItemId)
        if (!item) return null
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5" />
                  History Stock Masuk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Qty Masuk</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead className="w-24">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedItemRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            Belum ada riwayat stock masuk
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedItemRecords.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-green-600 font-semibold">
                              +{r.qty}
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {r.items?.current_stock ?? "-"}
                            </TableCell>
                            <TableCell>{r.note ?? "-"}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {new Date(r.created_at).toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditDialog(r)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => openDeleteDialog(r)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )
      })()}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus data stock masuk ini?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                      return sel ? `${sel.part_number} (Stock: ${sel.current_stock})` : null
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      <span className="truncate">{item.part_number} - {item.category} (Stock: {item.current_stock})</span>
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
