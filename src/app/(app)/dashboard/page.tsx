import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canAccessApp } from "@/lib/permissions"
import AppGrid from "@/components/dashboard/AppGrid"
import { AppTile } from "@/types"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) return null

  const { permissions, isSuperAdmin } = session.user

  const apps = await prisma.app.findMany({
    orderBy: { sortOrder: "asc" },
  })

  // Filter to apps the user can access
  const visibleApps: AppTile[] = apps.filter((app) =>
    canAccessApp(permissions, isSuperAdmin, app.requiredPermission)
  )

  const firstName = session.user.name?.split(" ")[0] ?? "there"

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-charcoal">
          Good to see you, {firstName}
        </h1>
        <p className="text-charcoal-muted text-sm mt-1">
          Select an application to get started.
        </p>
      </div>

      <AppGrid apps={visibleApps} />
    </div>
  )
}
