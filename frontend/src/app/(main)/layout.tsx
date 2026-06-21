import { Sidebar } from "@/components/sidebar"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-muted/30 p-4 pt-14 md:pt-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
