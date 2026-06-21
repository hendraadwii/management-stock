"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Item, DeliveryOrder, DeliveryOrderDetail } from "@/types"
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
import { Plus, Trash2, Pencil, Truck } from "lucide-react"

interface DOFormItem {
  item_id: string
  part_number: string
  item_name: string
  category_name: string
  rack_code: string
  qty: number
  current_stock: number
}

export default function DeliveryOrderPage() {
  const [items, setItems] = useState<Item[]>([])
  const [doList, setDoList] = useState<DeliveryOrder[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDo, setEditDo] = useState<DeliveryOrder | null>(null)
  const [poNumber, setPoNumber] = useState("")
  const [shipping, setShipping] = useState("")
  const [selectedItem, setSelectedItem] = useState("")
  const [qty, setQty] = useState("")
  const [formItems, setFormItems] = useState<DOFormItem[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()

  const fetchData = async () => {
    const { data: itemsData } = await supabase
      .from("items")
      .select("*, categories(*), racks(*)")
      .order("part_number")

    const { data: doData } = await supabase
      .from("delivery_orders")
      .select("*, delivery_order_details(*, items(*))")
      .order("created_at", { ascending: false })
      .limit(50)

    if (itemsData) setItems(itemsData as unknown as Item[])
    if (doData) setDoList(doData as unknown as DeliveryOrder[])
  }

  useEffect(() => {
    fetchData()
  }, [supabase])

  const addItem = () => {
    if (!selectedItem || !qty || parseInt(qty) <= 0) {
      toast.error("Pilih barang dan masukkan qty yang valid")
      return
    }

    const item = items.find((i) => i.id === selectedItem)
    if (!item) return

    const qtyNum = parseInt(qty)
    const availableStock = editDo
      ? item.current_stock +
        (formItems.find((f) => f.item_id === selectedItem)?.qty || 0)
      : item.current_stock

    if (qtyNum > availableStock) {
      toast.error(
        `Stock tidak mencukupi. Stock tersedia: ${availableStock}`
      )
      return
    }

    const existingIndex = formItems.findIndex(
      (f) => f.item_id === selectedItem
    )

    if (existingIndex >= 0) {
      const updated = [...formItems]
      const newQty = updated[existingIndex].qty + qtyNum
      if (newQty > availableStock) {
        toast.error(
          `Total qty melebihi stock. Stock tersedia: ${availableStock}`
        )
        return
      }
      updated[existingIndex].qty = newQty
      setFormItems(updated)
    } else {
      setFormItems([
        ...formItems,
        {
          item_id: item.id,
          part_number: item.part_number,
          item_name: item.item_name,
          category_name: (item as any).categories?.name ?? "-",
          rack_code: (item as any).racks?.rack_code ?? "-",
          qty: qtyNum,
          current_stock: item.current_stock,
        },
      ])
    }

    setSelectedItem("")
    setQty("")
  }

  const removeItem = (itemId: string) => {
    setFormItems(formItems.filter((f) => f.item_id !== itemId))
  }

  const generateDONumber = async (): Promise<string> => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")

    const { data: lastDO } = await supabase
      .from("delivery_orders")
      .select("do_number")
      .ilike("do_number", `ASTEK/${year}/${month}/%`)
      .order("do_number", { ascending: false })
      .limit(1)

    let seq = 1
    if (lastDO && lastDO.length > 0) {
      const lastSeq = parseInt(lastDO[0].do_number.split("/")[3])
      if (!isNaN(lastSeq)) seq = lastSeq + 1
    }

    return `ASTEK/${year}/${month}/${String(seq).padStart(4, "0")}`
  }

  const openNewDialog = () => {
    setEditDo(null)
    setPoNumber("")
    setShipping("")
    setFormItems([])
    setDialogOpen(true)
  }

  const openEditDialog = async () => {
    if (!selectedId) return
    const doRecord = doList.find((d) => d.id === selectedId)
    if (!doRecord) return

    setEditDo(doRecord)
    setPoNumber(doRecord.po_number)
    setShipping(doRecord.shipping)

    const details = doRecord.delivery_order_details || []
    const doFormItems: DOFormItem[] = details.map((d: any) => {
      const item = items.find((i) => i.id === d.item_id)
      return {
        item_id: d.item_id,
        part_number: d.items?.part_number ?? item?.part_number ?? "-",
        item_name: d.items?.item_name ?? item?.item_name ?? "-",
        category_name:
          (d.items as any)?.categories?.name ??
          (item as any)?.categories?.name ??
          "-",
        rack_code:
          (d.items as any)?.racks?.rack_code ??
          (item as any)?.racks?.rack_code ??
          "-",
        qty: d.qty,
        current_stock: item?.current_stock ?? 0,
      }
    })
    setFormItems(doFormItems)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedId) return
    if (!confirm("Yakin ingin menghapus Delivery Order ini?")) return

    const doRecord = doList.find((d) => d.id === selectedId)
    if (!doRecord) return

    const details = doRecord.delivery_order_details || []
    for (const d of details) {
      const { data: itemData } = await supabase
        .from("items")
        .select("current_stock")
        .eq("id", d.item_id)
        .single()

      if (itemData) {
        await supabase
          .from("items")
          .update({ current_stock: itemData.current_stock + d.qty })
          .eq("id", d.item_id)
      }
    }

    const { error } = await supabase
      .from("delivery_orders")
      .delete()
      .eq("id", selectedId)

    if (error) {
      toast.error("Gagal menghapus Delivery Order")
      return
    }

    toast.success("Delivery Order berhasil dihapus")
    setSelectedId(null)
    fetchData()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!poNumber.trim() || !shipping.trim()) {
      toast.error("Nomor PO dan Shipping harus diisi")
      return
    }

    if (formItems.length === 0) {
      toast.error("Minimal 1 item harus ditambahkan")
      return
    }

    setLoading(true)

    if (editDo) {
      const { error: updateError } = await supabase
        .from("delivery_orders")
        .update({
          po_number: poNumber.trim(),
          shipping: shipping.trim(),
        })
        .eq("id", editDo.id)

      if (updateError) {
        toast.error("Gagal mengupdate Delivery Order")
        setLoading(false)
        return
      }

      const oldDetails = editDo.delivery_order_details || []
      for (const d of oldDetails) {
        const { data: itemData } = await supabase
          .from("items")
          .select("current_stock")
          .eq("id", d.item_id)
          .single()
        if (itemData) {
          await supabase
            .from("items")
            .update({ current_stock: itemData.current_stock + d.qty })
            .eq("id", d.item_id)
        }
      }

      await supabase
        .from("delivery_order_details")
        .delete()
        .eq("delivery_order_id", editDo.id)

      await supabase
        .from("stock_movements")
        .delete()
        .eq("reference_number", editDo.do_number)

      for (const item of formItems) {
        await supabase.from("delivery_order_details").insert({
          delivery_order_id: editDo.id,
          item_id: item.item_id,
          qty: item.qty,
        })

        const { data: itemData } = await supabase
          .from("items")
          .select("current_stock")
          .eq("id", item.item_id)
          .single()

        if (itemData) {
          const newStock = itemData.current_stock - item.qty
          await supabase
            .from("items")
            .update({ current_stock: newStock })
            .eq("id", item.item_id)
        }

        await supabase.from("stock_movements").insert({
          item_id: item.item_id,
          movement_type: "delivery_order",
          qty: item.qty,
          reference_number: editDo.do_number,
        })
      }

      toast.success(`Delivery Order ${editDo.do_number} berhasil diupdate`)
    } else {
      const doNumber = await generateDONumber()

      const { data: doRecord, error: doError } = await supabase
        .from("delivery_orders")
        .insert({
          do_number: doNumber,
          po_number: poNumber.trim(),
          shipping: shipping.trim(),
          created_by: user?.id,
        })
        .select()
        .single()

      if (doError || !doRecord) {
        toast.error("Gagal membuat Delivery Order")
        setLoading(false)
        return
      }

      for (const item of formItems) {
        await supabase.from("delivery_order_details").insert({
          delivery_order_id: doRecord.id,
          item_id: item.item_id,
          qty: item.qty,
        })

        const { data: itemData } = await supabase
          .from("items")
          .select("current_stock")
          .eq("id", item.item_id)
          .single()

        if (itemData) {
          const newStock = itemData.current_stock - item.qty
          await supabase
            .from("items")
            .update({ current_stock: newStock })
            .eq("id", item.item_id)
        }

        await supabase.from("stock_movements").insert({
          item_id: item.item_id,
          movement_type: "delivery_order",
          qty: item.qty,
          reference_number: doNumber,
        })
      }

      toast.success(`Delivery Order ${doNumber} berhasil dibuat`)
    }

    setDialogOpen(false)
    setPoNumber("")
    setShipping("")
    setFormItems([])
    setEditDo(null)
    setLoading(false)
    fetchData()
  }

  const doColumns: ColumnDef<DeliveryOrder>[] = [
    {
      id: "select",
      header: "",
      cell: ({ row }) => (
        <input
          type="radio"
          name="do-select"
          className="h-4 w-4 cursor-pointer"
          checked={selectedId === row.original.id}
          onChange={() => setSelectedId(row.original.id)}
        />
      ),
    },
    {
      accessorKey: "do_number",
      header: "Nomor DO",
    },
    {
      accessorKey: "po_number",
      header: "Nomor PO",
    },
    {
      accessorKey: "shipping",
      header: "Shipping",
    },
    {
      accessorKey: "created_at",
      header: "Tanggal",
      cell: ({ row }) =>
        new Date(row.original.created_at).toLocaleDateString("id-ID"),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Delivery Order
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola Delivery Order untuk pengeluaran barang
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
        columns={doColumns}
        data={doList}
        searchKey="do_number"
        searchPlaceholder="Cari nomor DO..."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-w-full max-h-[90dvh] p-4 sm:p-6 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 shrink-0" />
              <span className="truncate">{editDo ? "Edit Delivery Order" : "New Delivery Order"}</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="poNumber">Nomor PO</Label>
                <Input
                  id="poNumber"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="Masukkan nomor PO"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping">Shipping</Label>
                <Input
                  id="shipping"
                  value={shipping}
                  onChange={(e) => setShipping(e.target.value)}
                  placeholder="Nama shipping / ekspedisi"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Detail Item</Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Select
                    value={selectedItem}
                    onValueChange={(v) => v && setSelectedItem(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih barang...">
                        {(() => {
                          const sel = items.find(i => i.id === selectedItem)
                          return sel ? `${sel.part_number} - ${sel.item_name} (Stock: ${sel.current_stock})` : null
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          <span className="truncate">{item.part_number} - {item.item_name} (Stock: {item.current_stock})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-24 space-y-2">
                  <Input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="Qty"
                  />
                </div>
                <Button type="button" variant="outline" onClick={addItem} className="shrink-0">
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Baris
                </Button>
              </div>

              {formItems.length > 0 && (
                <div className="rounded-md border overflow-x-auto">
                  <Table className="min-w-[500px] sm:min-w-0">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Part Number</TableHead>
                        <TableHead className="whitespace-nowrap">Nama Barang</TableHead>
                        <TableHead className="whitespace-nowrap hidden sm:table-cell">Kategori</TableHead>
                        <TableHead className="whitespace-nowrap hidden sm:table-cell">Rak</TableHead>
                        <TableHead className="whitespace-nowrap">Qty</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formItems.map((item) => (
                        <TableRow key={item.item_id}>
                          <TableCell className="whitespace-nowrap">{item.part_number}</TableCell>
                          <TableCell className="whitespace-nowrap">{item.item_name}</TableCell>
                          <TableCell className="whitespace-nowrap hidden sm:table-cell">{item.category_name}</TableCell>
                          <TableCell className="whitespace-nowrap hidden sm:table-cell">{item.rack_code}</TableCell>
                          <TableCell className="whitespace-nowrap">{item.qty}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.item_id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive shrink-0" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Menyimpan..."
                : editDo
                  ? "Update Delivery Order"
                  : "Simpan Delivery Order"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
