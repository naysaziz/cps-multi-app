import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import GrantListClient from "@/components/grants-isbe/GrantListClient"
import { ContractSummary } from "@/types"

export default async function GrantsIsbeListPage() {
  const session = await auth()
  if (!session) redirect("/login")

  if (!session.user.permissions.includes("grants_isbe:view") && !session.user.isSuperAdmin) {
    redirect("/dashboard")
  }

  const isDirector =
    session.user.isSuperAdmin ||
    session.user.permissions.includes("grants_isbe:manage")

  const contracts = await prisma.contract.findMany({
    where: isDirector
      ? undefined
      : { assignments: { some: { userId: session.user.id } } },
    include: {
      assignments: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      fsgReports: { select: { id: true, period: true, uploadedAt: true } },
      budgetUploads: { select: { id: true, fiscalYear: true, uploadedAt: true } },
    },
    orderBy: [{ fiscalYear: "desc" }, { grantName: "asc" }],
  })

  // Serialize Decimal fields for client components
  const serialized: ContractSummary[] = contracts.map((c) => ({
    ...c,
    commitmentAmount: c.commitmentAmount != null ? String(c.commitmentAmount) : null,
    arAmount: c.arAmount != null ? String(c.arAmount) : null,
    isbeVoucheredToDate: c.isbeVoucheredToDate != null ? String(c.isbeVoucheredToDate) : null,
    isbeOutstandingObligs: c.isbeOutstandingObligs != null ? String(c.isbeOutstandingObligs) : null,
    isbeCarryover: c.isbeCarryover != null ? String(c.isbeCarryover) : null,
    projectStartDate: c.projectStartDate?.toISOString() ?? null,
    projectEndDate: c.projectEndDate?.toISOString() ?? null,
    fsgReports: c.fsgReports.map((r) => ({
      ...r,
      uploadedAt: r.uploadedAt.toISOString(),
    })),
    budgetUploads: c.budgetUploads.map((b) => ({
      ...b,
      uploadedAt: b.uploadedAt.toISOString(),
    })),
  }))

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">ISBE Grants</h1>
          <p className="text-charcoal-muted text-sm mt-1">
            {isDirector
              ? `${contracts.length} grants across all coordinators`
              : `${contracts.length} grants assigned to you`}
          </p>
        </div>
        {isDirector && (
          <Link
            href="/grants-isbe/import"
            className="inline-flex items-center gap-2 px-4 py-2 bg-cobalt text-white text-sm font-medium rounded-md hover:bg-cobalt-dark transition-colors"
          >
            Import Master List
          </Link>
        )}
      </div>

      <GrantListClient contracts={serialized} isDirector={isDirector} currentUserId={session.user.id} />
    </div>
  )
}
