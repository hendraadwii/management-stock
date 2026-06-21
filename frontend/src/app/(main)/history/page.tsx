"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { Item } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChevronDown,
  ChevronRight,
  Search,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react"

interface DOData {
  id: string
  do_number: string
  po_number: string
  qty: number
  created_at: string
  status: string
}

export default function MonitoringStockPage() {
  const [items, setItems] = useState<Item[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [doCache, setDoCache] = useState<Record<string, DOData[]>>({})
  const [loadingDO, setLoadingDO] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase
        .from("mst_items")
        .select("*")
        .order("part_number")
      if (data) setItems(data as unknown as Item[])
    }
    fetchItems()
  }, [supabase])

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items
    const q = searchQuery.toLowerCase()
    return items.filter((item) =>
      item.part_number.toLowerCase().includes(q)
    )
  }, [items, searchQuery])

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const toggleExpand = async (itemId: string) => {
    if (expandedId === itemId) {
      setExpandedId(null)
      return
    }
    setExpandedId(itemId)

    if (!doCache[itemId]) {
      setLoadingDO((prev) => ({ ...prev, [itemId]: true }))

      const { data: details } = await supabase
        .from("delivery_order_details")
        .select("id, qty, delivery_order_id")
        .eq("item_id", itemId)

      if (details && details.length > 0) {
        const doIds = details.map((d) => d.delivery_order_id)
        const { data: orders } = await supabase
          .from("delivery_orders")
          .select("id, do_number, po_number, created_at, status")
          .in("id", doIds)

        if (orders) {
          const orderMap = new Map(orders.map((o: any) => [o.id, o]))
          const mapped: DOData[] = details
            .map((d) => {
              const order = orderMap.get(d.delivery_order_id)
              if (!order) return null
              return {
                id: d.id,
                do_number: order.do_number,
                po_number: order.po_number,
                qty: d.qty,
                created_at: order.created_at,
                status: order.status || "draft",
              }
            })
            .filter((d): d is DOData => d !== null)
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )

          setDoCache((prev) => ({ ...prev, [itemId]: mapped }))
        }
      }
      setLoadingDO((prev) => ({ ...prev, [itemId]: false }))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Monitoring Stock
        </h1>
        <p className="text-sm text-muted-foreground">
          Pantau stok barang dan riwayat Delivery Order
        </p>
      </div>

      <div className="flex items-center py-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari part number..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Part Number</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Rak</TableHead>
              <TableHead className="text-right">QTY Current Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Tidak ada data stock
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleExpand(item.id)}
                >
                  <TableCell>
                    {expandedId === item.id ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{item.part_number}</TableCell>
                  <TableCell>{item.category ?? "-"}</TableCell>
                  <TableCell>{item.rack ?? "-"}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {item.current_stock}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {expandedId && doCache[expandedId] && (
        <div className="rounded-md border bg-muted/30 overflow-x-auto">
          <div className="px-4 py-3 text-sm font-semibold text-muted-foreground">
            Riwayat Delivery Order
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. DO</TableHead>
                <TableHead>No. PO</TableHead>
                <TableHead>QTY</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doCache[expandedId].length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Tidak ada riwayat Delivery Order
                  </TableCell>
                </TableRow>
              ) : (
                doCache[expandedId].map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.do_number}</TableCell>
                    <TableCell>{d.po_number}</TableCell>
                    <TableCell className="tabular-nums">{d.qty}</TableCell>
                    <TableCell>
                      {d.status === "submitted" ? (
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          Submitted
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
                          Draft
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(d.created_at).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-4">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
