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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Trash2, Pencil, Truck, FileDown, CheckCircle, FileText } from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface DOFormItem {
  item_id: string
  part_number: string
  category: string | null
  rack: string | null
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
      .from("mst_items")
      .select("*")
      .order("part_number")

    const { data: doData } = await supabase
      .from("delivery_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)

    const { data: detailsData } = await supabase
      .from("delivery_order_details")
      .select("*")

    if (itemsData) setItems(itemsData as unknown as Item[])
    if (doData && detailsData && itemsData) {
      const merged = doData.map((d: any) => ({
        ...d,
        delivery_order_details: (detailsData as any[])
          .filter((det: any) => det.delivery_order_id === d.id)
          .map((det: any) => ({
            ...det,
            items: itemsData.find((i: any) => i.id === det.item_id) ?? null,
          })),
      }))
      setDoList(merged as unknown as DeliveryOrder[])
    } else if (doData) {
      setDoList(doData as unknown as DeliveryOrder[])
    }
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
    const availableStock = item.current_stock

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
          category: item.category,
          rack: item.rack,
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
    const doRecord = doList.find((d: any) => d.id === selectedId)
    if (!doRecord) return
    if ((doRecord as any).status === "submitted") {
      toast.error("Tidak bisa mengedit DO yang sudah disubmit")
      return
    }
    if (!confirm("Yakin ingin mengedit data ini?")) return

    setEditDo(doRecord)
    setPoNumber(doRecord.po_number)
    setShipping(doRecord.shipping)

    const details = (doRecord as any).delivery_order_details || []
    const doFormItems: DOFormItem[] = details.map((d: any) => {
      const item = items.find((i) => i.id === d.item_id)
      return {
        item_id: d.item_id,
        part_number: d.items?.part_number ?? item?.part_number ?? "-",
        category: d.items?.category ?? item?.category ?? "-",
        rack: d.items?.rack ?? item?.rack ?? "-",
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

    const doRecord = doList.find((d: any) => d.id === selectedId)
    if (!doRecord) return

    if ((doRecord as any).status === "submitted") {
      const details = (doRecord as any).delivery_order_details || []
      for (const d of details) {
        const { data: itemData } = await supabase
          .from("mst_items")
          .select("current_stock")
          .eq("id", d.item_id)
          .single()

        if (itemData) {
          await supabase
            .from("mst_items")
            .update({ current_stock: itemData.current_stock + d.qty })
            .eq("id", d.item_id)
        }
      }
    }

    await supabase
      .from("delivery_order_details")
      .delete()
      .eq("delivery_order_id", selectedId)

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

  const handleSubmitDO = async () => {
    if (!selectedId) return
    const doRecord = doList.find((d: any) => d.id === selectedId)
    if (!doRecord) return
    if ((doRecord as any).status !== "draft") return
    if (!confirm("Yakin ingin submit Delivery Order ini? Stok akan dikurangi.")) return

    setLoading(true)
    const details = (doRecord as any).delivery_order_details || []

    for (const d of details) {
      const { data: itemData } = await supabase
        .from("mst_items")
        .select("current_stock")
        .eq("id", d.item_id)
        .single()

      if (itemData) {
        const newStock = itemData.current_stock - d.qty
        if (newStock < 0) {
          toast.error(`Stock ${d.items?.part_number || d.item_id} tidak mencukupi`)
          setLoading(false)
          return
        }
        await supabase
          .from("mst_items")
          .update({ current_stock: newStock })
          .eq("id", d.item_id)
      }
    }

    const { error } = await supabase
      .from("delivery_orders")
      .update({ status: "submitted" })
      .eq("id", selectedId)

    if (error) {
      toast.error("Gagal submit Delivery Order")
      setLoading(false)
      return
    }

    toast.success(`Delivery Order ${(doRecord as any).do_number} berhasil disubmit`)
    setLoading(false)
    fetchData()
  }

  const handleExport = async () => {
    if (!selectedId) return
    const doRecord = doList.find((d) => d.id === selectedId)
    if (!doRecord) return

    const { data: doRecord_ } = await supabase
      .from("delivery_orders")
      .select("*")
      .eq("id", selectedId)
      .single()

    if (!doRecord_) return

    const { data: detailRows } = await supabase
      .from("delivery_order_details")
      .select("*")
      .eq("delivery_order_id", selectedId)

    const { data: itemsData_ } = await supabase
      .from("mst_items")
      .select("*")

    const doDetail: any = {
      ...doRecord_,
      delivery_order_details: (detailRows || []).map((det: any) => ({
        ...det,
        items: itemsData_?.find((i: any) => i.id === det.item_id) ?? null,
      })),
    }

    const details = doDetail.delivery_order_details || []
    const lastDataRow = 5 + details.length

    const rawData = [
      ["NO PO", doRecord.po_number],
      ["NO DO", doRecord.do_number],
      ["Shipping", doRecord.shipping],
      ["Date", new Date(doRecord.created_at).toLocaleDateString("id-ID")],
      [],
      ["No", "Category", "Part Number", "QTY Out"],
      ...details.map((d: any, i: number) => [
        i + 1,
        d.items?.category ?? "-",
        d.items?.part_number ?? "-",
        d.qty,
      ]),
      [],
      ["", "", "", "Mengetahui,"],
      ["", "", "", `( ${" ".repeat(20)} )`],
    ]

    const ws = XLSX.utils.aoa_to_sheet(rawData)

    const range = XLSX.utils.decode_range(ws["!ref"] || "A1:D1")
    const thin = { style: "thin" }
    const border = { top: thin, bottom: thin, left: thin, right: thin }

    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (!ws[addr]) continue
        if (!ws[addr].s) ws[addr].s = {}
        ws[addr].s.border = border
      }
    }

    for (let c = 0; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c })
      if (!ws[addr]) continue
      if (!ws[addr].s) ws[addr].s = {}
      ws[addr].s.font = { bold: true }
    }

    for (let r = 0; r <= 3; r++) {
      const addr0 = XLSX.utils.encode_cell({ r, c: 0 })
      if (!ws[addr0]) continue
      if (!ws[addr0].s) ws[addr0].s = {}
      ws[addr0].s.font = { bold: true }
    }

    const headerRow = 5
    for (let c = 0; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRow, c })
      if (!ws[addr]) continue
      if (!ws[addr].s) ws[addr].s = {}
      ws[addr].s.font = { bold: true }
      ws[addr].s.alignment = { horizontal: "center", vertical: "center" }
    }

    for (let r = range.s.r; r <= range.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: 0 })
      if (!ws[addr]) continue
      if (!ws[addr].s) ws[addr].s = {}
      ws[addr].s.alignment = { horizontal: "center", vertical: "center" }
    }

    for (let r = 6; r <= range.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: 3 })
      if (!ws[addr]) continue
      if (!ws[addr].s) ws[addr].s = {}
      ws[addr].s.alignment = { horizontal: "center", vertical: "center" }
    }

    ws["!cols"] = [
      { wch: 12 },
      { wch: 25 },
      { wch: 30 },
      { wch: 30 },
    ]

    ws["!print"] = {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.7,
        right: 0.7,
        top: 0.7,
        bottom: 0.7,
        header: 0.3,
        footer: 0.3,
      },
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Delivery Order")
    XLSX.writeFile(wb, `DO_${doRecord.do_number.replace(/\//g, "-")}.xlsx`)
  }

  const handleExportPdf = async () => {
    if (!selectedId) return
    const doRecord = doList.find((d) => d.id === selectedId)
    if (!doRecord) return

    const { data: doRecord_ } = await supabase
      .from("delivery_orders")
      .select("*")
      .eq("id", selectedId)
      .single()

    if (!doRecord_) return

    const { data: detailRows } = await supabase
      .from("delivery_order_details")
      .select("*")
      .eq("delivery_order_id", selectedId)

    const { data: itemsData_ } = await supabase
      .from("mst_items")
      .select("*")

    const details = (detailRows || []).map((det: any) => ({
      ...det,
      items: itemsData_?.find((i: any) => i.id === det.item_id) ?? null,
    }))

    const doc = new jsPDF("portrait", "mm", "a4")
    const pageW = doc.internal.pageSize.getWidth()
    const margin = 20
    let y = 25

    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)

    const info = [
      ["NO PO", doRecord.po_number],
      ["NO DO", doRecord.do_number],
      ["Shipping", doRecord.shipping],
      ["Date", new Date(doRecord.created_at).toLocaleDateString("id-ID")],
    ]
    info.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold")
      doc.text(`${label}:`, margin, y)
      const labelW = doc.getTextWidth(`${label}:`)
      doc.setFont("helvetica", "normal")
      doc.text(String(value), margin + labelW + 2, y)
      y += 7
    })

    y += 4

    const tableBody = details.map((d: any, i: number) => [
      i + 1,
      d.items?.category ?? "-",
      d.items?.part_number ?? "-",
      d.qty,
    ])

    autoTable(doc, {
      startY: y,
      head: [["No", "Category", "Part Number", "QTY Out"]],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        3: { halign: "center" },
      },
      margin: { left: margin, right: margin },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 10

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text("Mengetahui,", pageW - margin, finalY, { align: "right" })
    doc.text(`( ${" ".repeat(25)} )`, pageW - margin, finalY + 10, { align: "right" })

    doc.save(`DO_${doRecord.do_number.replace(/\//g, "-")}.pdf`)
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
      await supabase
        .from("delivery_order_details")
        .delete()
        .eq("delivery_order_id", editDo.id)

      for (const item of formItems) {
        await supabase.from("delivery_order_details").insert({
          delivery_order_id: editDo.id,
          item_id: item.item_id,
          qty: item.qty,
        })
      }

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

      toast.success(`Delivery Order ${editDo.do_number} berhasil diupdate`)
    } else {
      const doNumber = await generateDONumber()

      const { data: doRecord, error: doError } = await supabase
        .from("delivery_orders")
        .insert({
          do_number: doNumber,
          po_number: poNumber.trim(),
          shipping: shipping.trim(),
          status: "draft",
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
      }

      toast.success(`Delivery Order ${doNumber} berhasil dibuat (draft)`)
    }

    setDialogOpen(false)
    setPoNumber("")
    setShipping("")
    setFormItems([])
    setEditDo(null)
    setLoading(false)
    fetchData()
  }

  const selectedDo = doList.find((d: any) => d.id === selectedId)
  const isSubmitted = (selectedDo as any)?.status === "submitted"

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
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = (row.original as any).status
        return s === "submitted" ? (
          <Badge className="bg-green-100 text-green-700 border-green-300">Submitted</Badge>
        ) : (
          <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">Draft</Badge>
        )
      },
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
            disabled={!selectedId || isSubmitted}
            onClick={openEditDialog}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Data
          </Button>
          {!isSubmitted && (
            <Button
              variant="default"
              disabled={!selectedId}
              onClick={handleSubmitDO}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Submit
            </Button>
          )}
          <Button
            variant="destructive"
            disabled={!selectedId}
            onClick={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Data
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" disabled={!selectedId}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExport}>
                <FileDown className="mr-2 h-4 w-4" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdf}>
                <FileText className="mr-2 h-4 w-4" />
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DataTable
        columns={doColumns}
        data={doList}
        searchKey="do_number"
        searchPlaceholder="Cari nomor DO..."
      />

      {selectedId && selectedDo && (() => {
        const d = selectedDo as any
        const details = d.delivery_order_details || []
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Detail Delivery Order
                {d.status === "submitted" ? (
                  <Badge className="bg-green-100 text-green-700 border-green-300 ml-2">Submitted</Badge>
                ) : (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50 ml-2">Draft</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex gap-2 text-sm">
                  <span className="font-semibold min-w-20">NO PO:</span>
                  <span>{d.po_number}</span>
                </div>
                <div className="flex gap-2 text-sm">
                  <span className="font-semibold min-w-20">NO DO:</span>
                  <span>{d.do_number}</span>
                </div>
                <div className="flex gap-2 text-sm">
                  <span className="font-semibold min-w-20">Shipping:</span>
                  <span>{d.shipping}</span>
                </div>
                <div className="flex gap-2 text-sm">
                  <span className="font-semibold min-w-20">Date:</span>
                  <span>{new Date(d.created_at).toLocaleDateString("id-ID")}</span>
                </div>
              </div>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">No</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Part Number</TableHead>
                      <TableHead>Rak</TableHead>
                      <TableHead className="text-center">QTY Out</TableHead>
                      <TableHead className="text-center">Sisa Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">Tidak ada detail item</TableCell>
                      </TableRow>
                    ) : (
                      details.map((det: any, i: number) => (
                        <TableRow key={det.id}>
                          <TableCell className="text-center">{i + 1}</TableCell>
                          <TableCell>{det.items?.category ?? "-"}</TableCell>
                          <TableCell>{det.items?.part_number ?? "-"}</TableCell>
                          <TableCell>{det.items?.rack ?? "-"}</TableCell>
                          <TableCell className="text-center">{det.qty}</TableCell>
                          <TableCell className="text-center">{det.items?.current_stock ?? "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      })()}

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
                        <TableHead className="whitespace-nowrap">Kategori</TableHead>
                        <TableHead className="whitespace-nowrap">Rak</TableHead>
                        <TableHead className="whitespace-nowrap">Qty</TableHead>
                        <TableHead className="whitespace-nowrap">Sisa Stock</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formItems.map((item) => (
                        <TableRow key={item.item_id}>
                          <TableCell className="whitespace-nowrap">{item.part_number}</TableCell>
                          <TableCell className="whitespace-nowrap">{item.category}</TableCell>
                          <TableCell className="whitespace-nowrap">{item.rack}</TableCell>
                          <TableCell className="whitespace-nowrap">{item.qty}</TableCell>
                          <TableCell className="whitespace-nowrap">{item.current_stock}</TableCell>
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
