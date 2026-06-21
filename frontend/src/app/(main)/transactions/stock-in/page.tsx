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
import { Plus, Trash2, Pencil, ArrowRightLeft, Package, Truck } from "lucide-react"

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
  const [doHistory, setDoHistory] = useState<any[]>([])
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
      .from("mst_items")
      .select("*")
      .order("part_number")

    const { data: recordsData } = await supabase
      .from("stock_in")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)

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
  }, [supabase])

  useEffect(() => {
    if (!selectedId) {
      setDoHistory([])
      return
    }
    const record = records.find((r) => r.id === selectedId)
    if (!record) return

    const fetchDoHistory = async () => {
      const { data: doData } = await supabase
        .from("delivery_orders")
        .select("*")

      const { data: detailsData } = await supabase
        .from("delivery_order_details")
        .select("*")
        .eq("item_id", record.item_id)

      const { data: itemsData } = await supabase
        .from("mst_items")
        .select("*")

      if (doData && detailsData && itemsData) {
        const merged = detailsData.map((det: any) => {
          const doRecord = doData.find((d: any) => d.id === det.delivery_order_id)
          const item = itemsData.find((i: any) => i.id === det.item_id)
          return {
            ...det,
            do_number: doRecord?.do_number ?? "-",
            po_number: doRecord?.po_number ?? "-",
            status: doRecord?.status ?? "draft",
            created_at: doRecord?.created_at ?? det.created_at,
            items: item ?? null,
          }
        })
        setDoHistory(merged)
      }
    }

    fetchDoHistory()
  }, [selectedId, records, supabase])

  const openNewDialog = () => {
    setEditRecord(null)
    setSelectedItem("")
    setQty("")
    setNote("")
    setDialogOpen(true)
  }

  const openEditDialog = () => {
    if (!selectedId) return
    if (!confirm("Yakin ingin mengedit data ini?")) return
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
      .from("stock_in")
      .delete()
      .eq("id", selectedId)

    if (error) {
      toast.error("Gagal menghapus data stock masuk")
      return
    }

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
      accessorKey: "items.part_number",
      header: "Part Number",
      cell: ({ row }) => row.original.items?.part_number ?? "-",
    },
    {
      accessorKey: "items.category",
      header: "Category",
      cell: ({ row }) => row.original.items?.category ?? "-",
    },
    {
      accessorKey: "items.rack",
      header: "Rak",
      cell: ({ row }) => row.original.items?.rack ?? "-",
    },
    {
      accessorKey: "qty",
      header: "Qty Masuk",
    },
    {
      id: "current_stock",
      header: "Current Stock",
      cell: ({ row }) => row.original.items?.current_stock ?? "-",
    },
    {
      accessorKey: "created_at",
      header: "Tanggal",
      cell: ({ row }) =>
        new Date(row.original.created_at).toLocaleString("id-ID"),
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

      {selectedId && (() => {
        const r = records.find(rec => rec.id === selectedId)
        if (!r) return null
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Detail Stock Masuk
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex gap-2 text-sm">
                    <span className="font-semibold min-w-28">Tanggal:</span>
                    <span>{new Date(r.created_at).toLocaleDateString("id-ID")}</span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="font-semibold min-w-28">Part Number:</span>
                    <span>{r.items?.part_number ?? "-"}</span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="font-semibold min-w-28">Category:</span>
                    <span>{r.items?.category ?? "-"}</span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="font-semibold min-w-28">Rak:</span>
                    <span>{r.items?.rack ?? "-"}</span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="font-semibold min-w-28">Qty Masuk:</span>
                    <span className="text-green-600 font-semibold">+{r.qty}</span>
                  </div>
                  <div className="flex gap-2 text-sm sm:col-span-2">
                    <span className="font-semibold min-w-28">Keterangan:</span>
                    <span>{r.note || "-"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {doHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    History Stock Keluar (DO)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>DO Number</TableHead>
                          <TableHead>PO Number</TableHead>
                          <TableHead className="text-center">Qty Keluar</TableHead>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {doHistory.map((det: any) => (
                          <TableRow key={det.id}>
                            <TableCell>{det.do_number}</TableCell>
                            <TableCell>{det.po_number}</TableCell>
                            <TableCell className="text-center text-red-600 font-semibold">
                              -{det.qty}
                            </TableCell>
                            <TableCell>
                              {new Date(det.created_at).toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell>
                              {det.status === "submitted" ? (
                                <span className="text-green-600 font-semibold">Submitted</span>
                              ) : (
                                <span className="text-yellow-600 font-semibold">Draft</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )
      })()}

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
