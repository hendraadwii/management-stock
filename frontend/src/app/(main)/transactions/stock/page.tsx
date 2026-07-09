"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Item } from "@/types"
import { Badge } from "@/components/ui/badge"
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
import { Highlight, SearchKeywordContext } from "@/components/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { Plus, Trash2, Pencil, ArrowRightLeft, History, AlertTriangle } from "lucide-react"

interface HistoryRecord {
  id: string
  item_id: string
  qty: number
  tipe: "Stock Masuk" | "Delivery Order"
  note: string | null
  created_at: string
  created_by?: string
  do_number: string | null
  po_number: string | null
  items?: Item
}

interface GroupedItem {
  item: Item
  totalQty: number
}

export default function StockInPage() {
  const [items, setItems] = useState<Item[]>([])
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<HistoryRecord | null>(null)
  const [recordToDelete, setRecordToDelete] = useState<HistoryRecord | null>(null)
  const [selectedItem, setSelectedItem] = useState("")
  const [itemSearch, setItemSearch] = useState("")
  const [itemPopoverOpen, setItemPopoverOpen] = useState(false)
  const [qty, setQty] = useState("")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [deleteItemTarget, setDeleteItemTarget] = useState<GroupedItem | null>(null)
  const [deletingItem, setDeletingItem] = useState(false)
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

    const { data: doDetails } = await supabase
      .from("delivery_order_details")
      .select("id, item_id, qty, delivery_order_id, created_at")
    const { data: doOrders } = await supabase
      .from("delivery_orders")
      .select("id, do_number, po_number, created_at")
    const doMap = new Map((doOrders ?? []).map((o: any) => [o.id, o]))

    if (itemsData) setItems(itemsData)
    const allRecords: HistoryRecord[] = []

    if (recordsData) {
      for (const r of recordsData) {
        allRecords.push({
          id: r.id,
          item_id: r.item_id,
          qty: r.qty,
          tipe: "Stock Masuk",
          note: r.note,
          created_at: r.created_at,
          created_by: r.created_by,
          do_number: null,
          po_number: null,
          items: itemsData?.find((i: any) => i.id === r.item_id) ?? null,
        })
      }
    }

    if (doDetails) {
      for (const d of doDetails) {
        const order = doMap.get(d.delivery_order_id)
        allRecords.push({
          id: `do-${d.id}`,
          item_id: d.item_id,
          qty: -d.qty,
          tipe: "Delivery Order",
          note: null,
          created_at: order?.created_at ?? d.created_at,
          do_number: order?.do_number ?? null,
          po_number: order?.po_number ?? null,
          items: itemsData?.find((i: any) => i.id === d.item_id) ?? null,
        })
      }
    }

    allRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setRecords(allRecords)
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
    const all = Array.from(map.values()).sort((a, b) =>
      a.item.part_number.localeCompare(b.item.part_number)
    )
    return lowStockOnly ? all.filter((g) => g.item.current_stock < 200) : all
  }, [items, records, lowStockOnly])

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
    setItemSearch("")
    setQty("")
    setNote("")
    setDialogOpen(true)
  }

  const openEditDialog = (record: HistoryRecord) => {
    if (record.tipe !== "Stock Masuk") return
    setEditRecord(record)
    setSelectedItem(record.item_id)
    setQty(String(Math.abs(record.qty)))
    setNote(record.note || "")
    setDialogOpen(true)
  }

  const openDeleteDialog = (record: HistoryRecord) => {
    setRecordToDelete(record)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!recordToDelete || recordToDelete.tipe !== "Stock Masuk") return

    setDeleting(true)
    const record = recordToDelete

    try {
      const { data: itemData } = await supabase
        .from("mst_items")
        .select("current_stock")
        .eq("id", record.item_id)
        .single()

      if (itemData) {
        const newStock = Math.max(0, itemData.current_stock - Math.abs(record.qty))
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

  const handleDeleteItem = async () => {
    if (!deleteItemTarget) return
    setDeletingItem(true)
    try {
      const { error } = await supabase
        .from("trx_stock")
        .delete()
        .eq("item_id", deleteItemTarget.item.id)

      if (error) throw error

      // Reset current_stock ke 0
      await supabase
        .from("mst_items")
        .update({ current_stock: 0 })
        .eq("id", deleteItemTarget.item.id)

      toast.success("Semua data stock berhasil dihapus")
      await fetchData()
    } catch {
      toast.error("Gagal menghapus data stock")
    } finally {
      setDeletingItem(false)
      setDeleteItemTarget(null)
    }
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
      cell: ({ row }) => (
        <SearchKeywordContext.Consumer>
          {(keyword) => (
            <Highlight text={row.original.item.part_number} keyword={keyword} />
          )}
        </SearchKeywordContext.Consumer>
      ),
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
    // {
    //   id: "total_qty",
    //   header: "Total Qty Masuk",
    //   cell: ({ row }) => row.original.totalQty,
    // },
    {
      id: "current_stock",
      header: "Current Stock",
      cell: ({ row }) => row.original.item.current_stock,
    },
    {
      id: "uom",
      header: "UOM",
      cell: ({ row }) => (row.original.item as any).uom ?? "-",
    },
    ...(user?.role === "admin"
      ? [{
          id: "actions",
          header: "",
          cell: ({ row }: { row: any }) => (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteItemTarget(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ),
        }]
      : []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Stock
          </h1>
          <p className="text-sm text-muted-foreground">
            Catat barang masuk ke gudang
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={lowStockOnly ? "default" : "outline"}
            onClick={() => setLowStockOnly((v) => !v)}
            className={lowStockOnly ? "bg-amber-500 hover:bg-amber-600 border-amber-500" : ""}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Stok Menipis
          </Button>
          {user?.role !== "user" && (
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              New Data
            </Button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={groupedData}
        searchKey="item.part_number"
        searchPlaceholder="Cari part number..."
      />

      {/* selectedItemId && (() => {
        const item = items.find((i) => i.id === selectedItemId)
        if (!item) return null
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5" />
                  History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>NO DO</TableHead>
                        <TableHead>NO PO</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead className="text-green-600">QTY In</TableHead>
                        <TableHead className="text-red-600">QTY Out</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Tanggal</TableHead>
                        {user?.role !== "user" && <TableHead className="w-24">Aksi</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedItemRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={user?.role !== "user" ? 8 : 7} className="h-24 text-center text-muted-foreground">
                            Belum ada riwayat transaksi
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedItemRecords.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.do_number ?? "-"}</TableCell>
                            <TableCell>{r.po_number ?? "-"}</TableCell>
                            <TableCell>{r.note ?? "-"}</TableCell>
                            <TableCell className="text-green-600 font-semibold">
                              {r.tipe === "Stock Masuk" ? `+${r.qty}` : ""}
                            </TableCell>
                            <TableCell className="text-red-600 font-semibold">
                              {r.tipe === "Delivery Order" ? `${Math.abs(r.qty)}` : ""}
                            </TableCell>
                            <TableCell>
                              {r.tipe === "Stock Masuk" ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Stock Masuk</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">Delivery Order</Badge>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {new Date(r.created_at).toLocaleString("id-ID")}
                            </TableCell>
                            {user?.role !== "user" && (
                              <TableCell>
                                {r.tipe === "Stock Masuk" && (
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
                                )}
                              </TableCell>
                            )}
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
      })()*/ null}

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

      <Dialog open={!!deleteItemTarget} onOpenChange={(open) => { if (!open) setDeleteItemTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus Data Stock</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus data stock untuk item{" "}
              <strong>{deleteItemTarget?.item.part_number}</strong>? Seluruh riwayat stock masuk item ini akan dihapus dan current stock akan direset ke 0. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteItemTarget(null)}
              disabled={deletingItem}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteItem}
              disabled={deletingItem}
            >
              {deletingItem ? "Menghapus..." : "Hapus"}
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
              <div className="relative">
                <Input
                  placeholder="Ketik part number untuk cari..."
                  value={
                    selectedItem && !itemPopoverOpen
                      ? (items.find(i => i.id === selectedItem)?.part_number ?? itemSearch)
                      : itemSearch
                  }
                  onChange={(e) => {
                    setItemSearch(e.target.value)
                    if (selectedItem) setSelectedItem("")
                  }}
                  onFocus={() => setItemPopoverOpen(true)}
                  onBlur={() => setTimeout(() => setItemPopoverOpen(false), 200)}
                  disabled={!!editRecord}
                  className="w-full"
                />
                {itemPopoverOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-popover shadow-md overflow-hidden">
                    <div className="overflow-auto max-h-[220px]">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-popover z-10">
                          <tr className="text-muted-foreground border-b">
                            <th className="px-3 py-2 font-medium text-left border-r">Part Number</th>
                            <th className="px-3 py-2 font-medium text-left border-r">Category</th>
                            <th className="px-3 py-2 font-medium text-left border-r">Rak</th>
                            <th className="px-3 py-2 font-medium text-left border-r">UOM</th>
                            <th className="px-3 py-2 font-medium text-right">Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const isSearching = itemSearch.trim().length > 0
                            const filtered = items.filter((item) =>
                              !isSearching
                                ? true
                                : item.part_number.toLowerCase().includes(itemSearch.toLowerCase()) ||
                                  (item.category ?? "").toLowerCase().includes(itemSearch.toLowerCase())
                            )
                            const displayed = isSearching ? filtered : filtered.slice(0, 5)
                            return displayed.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                                  Barang tidak ditemukan
                                </td>
                              </tr>
                            ) : (
                              <>
                                {displayed.map((item) => (
                                  <tr
                                    key={item.id}
                                    className="hover:bg-accent cursor-pointer"
                                    aria-selected={selectedItem === item.id}
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      setSelectedItem(item.id)
                                      setItemSearch("")
                                      setItemPopoverOpen(false)
                                    }}
                                  >
                                    <td className="px-3 py-2.5 border-r border-b">{item.part_number}</td>
                                    <td className="px-3 py-2.5 border-r border-b max-w-[120px] truncate">{item.category ?? "-"}</td>
                                    <td className="px-3 py-2.5 border-r border-b">{item.rack ?? "-"}</td>
                                    <td className="px-3 py-2.5 border-r border-b">{(item as any).uom ?? "-"}</td>
                                    <td className="px-3 py-2.5 border-b text-right tabular-nums">{item.current_stock}</td>
                                  </tr>
                                ))}
                                {!isSearching && filtered.length > 5 && (
                                  <tr>
                                    <td colSpan={5} className="px-3 py-2 text-center text-muted-foreground border-t bg-muted/30">
                                      +{filtered.length - 5} data lainnya. Ketik untuk cari lebih spesifik.
                                    </td>
                                  </tr>
                                )}
                              </>
                            )
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
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
