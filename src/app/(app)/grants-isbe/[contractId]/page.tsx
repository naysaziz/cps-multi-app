import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ContractDetail } from "@/types"
import GrantDetailClient from "@/components/grants-isbe/GrantDetailClient"

export default async function GrantDetailPage({
  params,
}: {
  params: Promise<{ contractId: string }>
}) {
  const { contractId } = await params
  const session = await auth()
  if (!session) redirect("/login")

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      assignments: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      fsgReports: {
        include: { uploadedBy: { select: { name: true, email: true } } },
        orderBy: { uploadedAt: "desc" },
      },
      budgetUploads: {
        include: { uploadedBy: { select: { name: true, email: true } } },
        orderBy: { uploadedAt: "desc" },
      },
    },
  })

  if (!contract) notFound()

  const isDirector =
    session.user.isSuperAdmin ||
    session.user.permissions.includes("grants_isbe:edit") ||
    session.user.permissions.includes("grants_isbe:manage")

  const assignment = contract.assignments.find((a) => a.userId === session.user.id)
  const canView = isDirector || !!assignment
  const canEdit = isDirector || assignment?.role === "editor"

  if (!canView) redirect("/dashboard")

  // Fetch all users for director assignment dropdown
  const allUsers = isDirector
    ? await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : []

  const decStr = (v: unknown) => (v != null ? String(v) : null)
  const dtStr = (v: Date | null) => v?.toISOString() ?? null

  const detail: ContractDetail = {
    ...contract,
    commitmentAmount: decStr(contract.commitmentAmount),
    arAmount: decStr(contract.arAmount),
    projectStartDate: dtStr(contract.projectStartDate),
    projectEndDate: dtStr(contract.projectEndDate),
    completionReportDate: dtStr(contract.completionReportDate),
    finalReportDate: dtStr(contract.finalReportDate),
    canEdit,
    fsgReports: contract.fsgReports.map((r) => ({
      id: r.id,
      period: r.period,
      uploadedAt: r.uploadedAt.toISOString(),
      parsedData: r.parsedData,
      uploadedBy: r.uploadedBy,
    })),
    budgetUploads: contract.budgetUploads.map((b) => ({
      id: b.id,
      fiscalYear: b.fiscalYear,
      uploadedAt: b.uploadedAt.toISOString(),
      parsedData: b.parsedData,
      uploadedBy: b.uploadedBy,
    })),
  }

  return (
    <GrantDetailClient
      contract={detail}
      allUsers={allUsers}
      isDirector={isDirector}
      currentUserId={session.user.id}
    />
  )
}
