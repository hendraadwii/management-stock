"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Package, Boxes, Truck } from "lucide-react"

export default function DashboardPage() {
  const [totalItems, setTotalItems] = useState(0)
  const [totalStock, setTotalStock] = useState(0)
  const [totalDO, setTotalDO] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { count: itemsCount } = await supabase
        .from("mst_items")
        .select("*", { count: "exact", head: true })

      const { data: stockData } = await supabase
        .from("mst_items")
        .select("current_stock")

      const totalStockValue =
        stockData?.reduce((acc, item) => acc + item.current_stock, 0) ?? 0

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0]

      const { count: doCount } = await supabase
        .from("delivery_orders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth)

      setTotalItems(itemsCount ?? 0)
      setTotalStock(totalStockValue)
      setTotalDO(doCount ?? 0)
    }

    fetchData()
  }, [supabase])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan data stock management
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Barang</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              DO Bulan Ini
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalDO}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
