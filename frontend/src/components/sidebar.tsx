"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { getIcon } from "@/lib/icon-map"
import { LogOut, Menu, Warehouse, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase"
import { Menu as MenuType } from "@/types"

function SidebarContent({
  user,
  signOut,
}: {
  user: any
  signOut: () => void
}) {
  const pathname = usePathname()
  const [menus, setMenus] = useState<MenuType[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchMenus = async () => {
      // 1. Ambil semua menu
      const { data: allMenus } = await supabase
        .from("menus")
        .select("*")
        .order("sort_order")
        .order("name")

      if (!allMenus) return

      // 2. Jika tidak ada user/role, kosongkan
      const userRoles = user?.roles?.length ? user.roles : (user?.role ? [user.role] : [])

      if (userRoles.length === 0) {
        setMenus([])
        return
      }

      // Jika salah satu role adalah admin, selalu tampilkan semua menu
      if (userRoles.some((r: string) => r.toLowerCase() === "admin")) {
        setMenus(allMenus)
        return
      }

      // 3. Aggregate access_menus dari semua role
      const { data: allRoleData } = await supabase
        .from("roles")
        .select("name, access_menus")
        .in("name", userRoles)

      const allowedIds = new Set<string>()
      for (const roleData of allRoleData || []) {
        const menus = roleData.access_menus || []
        menus.forEach((id: string) => allowedIds.add(id))
      }
      const allowedIdsArray = [...allowedIds]

      if (allowedIdsArray.length > 0) {
        const allowedIds = new Set(allowedIdsArray)
        
        // Otomatis tambahkan parent_id jika anak menu diizinkan agar kategoringya muncul di sidebar
        const parentIdsToAdd = new Set<string>()
        allMenus.forEach((m) => {
          if (allowedIds.has(m.id) && m.parent_id) {
            parentIdsToAdd.add(m.parent_id)
          }
        })
        
        const finalAllowedIds = new Set([...allowedIds, ...parentIdsToAdd])
        const filtered = allMenus.filter((m) => finalAllowedIds.has(m.id))
        setMenus(filtered)
      } else {
        // Jika belum memiliki hak akses, kosongkan menu
        setMenus([])
      }
    }
    fetchMenus()
  }, [supabase, user])

  const topMenus = menus.filter((m) => !m.parent_id && m.url)
  const parentMenus = menus.filter((m) => !m.parent_id && !m.url)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {user?.username?.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user?.username}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {user?.role}
          </p>
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="flex flex-col gap-1">
          {topMenus.map((item) => {
            const isActive = pathname === item.url
            return (
              <Link
                key={item.id}
                href={item.url || "#"}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {getIcon(item.icon)}
                {item.name}
              </Link>
            )
          })}
          {parentMenus.map((parent) => {
            const children = menus.filter(
              (m) => m.parent_id === parent.id
            )
            const isParentActive = children.some(
              (c) => pathname === c.url
            )
            return (
              <div key={parent.id} className="pt-3 first:pt-0">
                <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {parent.name}
                </p>
                {children.map((child) => {
                  const isActive = pathname === child.url
                  return (
                    <Link
                      key={child.id}
                      href={child.url || "#"}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {getIcon(child.icon)}
                      {child.name}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>
      </ScrollArea>
      <Separator />
      <div className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <>
      <aside className="hidden w-64 border-r bg-card md:block">
        <SidebarContent user={user} signOut={signOut} />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="fixed left-4 top-3 z-50 md:hidden"
            />
          }
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent user={user} signOut={signOut} />
        </SheetContent>
      </Sheet>
    </>
  )
}
