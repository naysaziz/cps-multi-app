import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canAccessApp } from "@/lib/permissions"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Construction } from "lucide-react"

export default async function AppSlugPage({
  params,
}: {
  params: Promise<{ appSlug: string }>
}) {
  const { appSlug } = await params
  const session = await auth()
  if (!session) return null

  const app = await prisma.app.findUnique({ where: { slug: appSlug } })
  if (!app) notFound()

  const { permissions, isSuperAdmin } = session.user
  if (!canAccessApp(permissions, isSuperAdmin, app.requiredPermission)) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔒</span>
        </div>
        <h1 className="text-lg font-semibold text-charcoal mb-2">Access Denied</h1>
        <p className="text-charcoal-muted text-sm mb-6">
          You don&apos;t have permission to access {app.name}. Contact your administrator.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-cobalt text-sm hover:underline"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-24 text-center">
      <div className="w-14 h-14 bg-cobalt-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Construction size={24} className="text-cobalt" />
      </div>
      <h1 className="text-lg font-semibold text-charcoal mb-2">{app.name}</h1>
      <p className="text-charcoal-muted text-sm mb-6">
        This application is under construction and will be available soon.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-cobalt text-sm hover:underline"
      >
        <ArrowLeft size={14} />
        Back to dashboard
      </Link>
    </div>
  )
}
