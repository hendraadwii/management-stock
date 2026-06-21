import { Sidebar } from "@/components/sidebar"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-muted/30 p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
