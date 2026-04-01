import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import TopNav from "@/components/layout/TopNav"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="flex flex-col h-screen">
      <TopNav session={session} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
