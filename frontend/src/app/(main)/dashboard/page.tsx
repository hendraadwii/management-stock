"use client"

import { useEffect, useState } from "react"
import { apiGet } from "@/lib/api"
import { Item } from "@/types"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Package,
  Boxes,
  Truck,
  AlertTriangle,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts"

interface LowStockItem {
  id: string
  part_number: string
  category: string | null
  current_stock: number
  uom: string | null
}

interface CategoryStock {
  category: string
  total_stock: number
}

interface MonthlyMovement {
  month: string
  stock_in: number
  delivery: number
}

interface RecentDO {
  id: string
  do_number: string
  po_number: string
  shipping: string
  created_at: string
  total_qty: number
}

export default function DashboardPage() {
  const [totalItems, setTotalItems] = useState(0)
  const [totalStock, setTotalStock] = useState(0)
  const [totalDO, setTotalDO] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [topCategories, setTopCategories] = useState<CategoryStock[]>([])
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [monthlyMovements, setMonthlyMovements] = useState<MonthlyMovement[]>([])
  const [recentDOs, setRecentDOs] = useState<RecentDO[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await apiGet<{
          data: {
            totalItems: number
            totalStock: number
            totalDO: number
            lowStockCount: number
            topCategories: CategoryStock[]
            lowStockItems: LowStockItem[]
            monthlyMovements: MonthlyMovement[]
            recentDOs: RecentDO[]
          }
        }>("/api/dashboard")

        setTotalItems(data.totalItems)
        setTotalStock(data.totalStock)
        setTotalDO(data.totalDO)
        setLowStockCount(data.lowStockCount)
        setTopCategories(data.topCategories)
        setLowStockItems(data.lowStockItems)
        setMonthlyMovements(data.monthlyMovements)
        setRecentDOs(data.recentDOs)
      } catch (error) {
        console.error("Gagal mengambil data dashboard:", error)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan data stock management
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {lowStockCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top 5 Categories by Stock */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 5 Categories by Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {topCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCategories} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="total_stock"
                    name="Total Stock"
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Belum ada data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Movement Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pergerakan Stock (6 Bulan)</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyMovements.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyMovements}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="stock_in"
                    name="Stock Masuk"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="delivery"
                    name="Delivery Order"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Belum ada data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Low Stock Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Items Stok Menipis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length > 0 ? (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-amber-50/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.part_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.category ?? "-"} | {item.uom ?? "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-amber-600">
                        {item.current_stock}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        min: 200
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-muted-foreground">
                Semua stok aman
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent DO */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-muted-foreground" />
              DO Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentDOs.length > 0 ? (
              <div className="space-y-3">
                {recentDOs.map((doItem) => (
                  <div
                    key={doItem.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium text-sm">{doItem.do_number}</p>
                      <p className="text-xs text-muted-foreground">
                        PO: {doItem.po_number || "-"} | {doItem.shipping}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {doItem.total_qty} pcs
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doItem.created_at).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-muted-foreground">
                Belum ada DO
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
