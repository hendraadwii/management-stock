"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { StockMovement } from "@/types"
import { DataTable } from "@/components/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"

export default function HistoryPage() {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("stock_movements")
        .select("*, items(*)")
        .order("created_at", { ascending: false })
        .limit(100)

      if (data) setMovements(data as unknown as StockMovement[])
    }

    fetchData()
  }, [supabase])

  const columns: ColumnDef<StockMovement>[] = [
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
      accessorKey: "movement_type",
      header: "Jenis Transaksi",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.movement_type === "stock_in"
              ? "default"
              : "destructive"
          }
        >
          {row.original.movement_type === "stock_in"
            ? "Stock In"
            : "Delivery Order"}
        </Badge>
      ),
    },
    {
      accessorKey: "qty",
      header: "Qty",
      cell: ({ row }) => (
        <span
          className={
            row.original.movement_type === "stock_in"
              ? "text-green-600"
              : "text-red-600"
          }
        >
          {row.original.movement_type === "stock_in" ? "+" : "-"}
          {row.original.qty}
        </span>
      ),
    },
    {
      accessorKey: "reference_number",
      header: "Referensi",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          History Stock
        </h1>
        <p className="text-sm text-muted-foreground">
          Riwayat pergerakan stock barang
        </p>
      </div>
      <DataTable
        columns={columns}
        data={movements}
        searchKey="items.part_number"
        searchPlaceholder="Cari part number..."
      />
    </div>
  )
}
