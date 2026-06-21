"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"

import { DataTable } from "@/components/data-table"
import { ColumnDef } from "@tanstack/react-table"

interface Movement {
  id: string
  created_at: string
  type: "Stock Masuk" | "Delivery Order"
  status: string | null
  part_number: string
  category: string
  qty: number
  do_number: string | null
  po_number: string | null
  keterangan: string | null
}

export default function HistoryPage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: itemsData } = await supabase
        .from("mst_items")
        .select("*")

      const { data: stockData } = await supabase
        .from("stock_in")
        .select("*")

      const { data: doData } = await supabase
        .from("delivery_orders")
        .select("*")

      const { data: detailsData } = await supabase
        .from("delivery_order_details")
        .select("*")

      const result: Movement[] = []

      if (stockData && itemsData) {
        for (const s of stockData) {
          const item = itemsData.find((i: any) => i.id === s.item_id)
          result.push({
            id: `in-${s.id}`,
            created_at: s.created_at,
            type: "Stock Masuk",
            status: null,
            part_number: item?.part_number ?? "-",
            category: item?.category ?? "-",
            qty: s.qty,
            do_number: null,
            po_number: null,
            keterangan: s.note || "-",
          })
        }
      }

      if (doData && detailsData && itemsData) {
        for (const d of doData) {
          for (const det of detailsData.filter((x: any) => x.delivery_order_id === d.id)) {
            const item = itemsData.find((i: any) => i.id === det.item_id)
            result.push({
              id: `out-${det.id}`,
              created_at: d.created_at,
              type: "Delivery Order",
              status: (d as any).status || "draft",
              part_number: item?.part_number ?? "-",
              category: item?.category ?? "-",
              qty: -det.qty,
              do_number: d.do_number,
              po_number: d.po_number,
              keterangan: null,
            })
          }
        }
      }

      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setMovements(result.slice(0, 200))
    }

    fetchData()
  }, [supabase])

  const columns: ColumnDef<Movement>[] = [
    {
      accessorKey: "created_at",
      header: "Tanggal",
      cell: ({ row }) =>
        new Date(row.original.created_at).toLocaleDateString("id-ID"),
    },
    {
      accessorKey: "type",
      header: "Tipe",
      cell: ({ row }) => {
        const m = row.original
        if (m.type === "Stock Masuk") {
          return (
            <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
              Stock Masuk
            </Badge>
          )
        }
        if (m.status === "submitted") {
          return (
            <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
              Delivery Order
            </Badge>
          )
        }
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
            Delivery Order (Draft)
          </Badge>
        )
      },
    },
    {
      accessorKey: "part_number",
      header: "Part Number",
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      accessorKey: "qty",
      header: "Qty",
      cell: ({ row }) => {
        const m = row.original
        if (m.type === "Stock Masuk") {
          return <span className="text-green-600 font-semibold">+{m.qty}</span>
        }
        if (m.status === "submitted") {
          return <span className="text-red-600 font-semibold">{m.qty}</span>
        }
        return <span className="text-yellow-600 font-semibold">{m.qty}</span>
      },
    },
    {
      accessorKey: "do_number",
      header: "DO Number",
      cell: ({ row }) => row.original.do_number ?? "-",
    },
    {
      accessorKey: "po_number",
      header: "PO Number",
      cell: ({ row }) => row.original.po_number ?? "-",
    },
    {
      accessorKey: "keterangan",
      header: "Keterangan",
      cell: ({ row }) => row.original.keterangan ?? "-",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          History Stock
        </h1>
        <p className="text-sm text-muted-foreground">
          Riwayat barang masuk (Stock In) dan barang keluar (Delivery Order)
        </p>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Submit / Stock Masuk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-yellow-500" />
          <span className="text-muted-foreground">Draft</span>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={movements}
        searchKey="part_number"
        searchPlaceholder="Cari part number..."
      />
    </div>
  )
}
