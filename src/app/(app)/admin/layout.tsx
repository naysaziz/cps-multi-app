import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Users, Shield, LayoutGrid, Settings } from "lucide-react"

const NAV = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/roles", label: "Roles", icon: Shield },
  { href: "/admin/apps", label: "App Tiles", icon: LayoutGrid },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user.isSuperAdmin) redirect("/dashboard")

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-charcoal">Administration</h1>
        <p className="text-charcoal-muted text-sm mt-0.5">
          Manage users, roles, and application access.
        </p>
      </div>

      {/* Tab nav */}
      <nav className="flex gap-1 mb-6 bg-white border border-silver-border rounded-lg p-1 w-fit">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-charcoal-mid hover:text-charcoal hover:bg-silver-light transition-colors"
          >
            <Icon size={14} />
            {label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  )
}
