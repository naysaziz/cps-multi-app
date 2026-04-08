import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ContractDetail, CashEntry } from "@/types"
import GrantDetailClient from "@/components/grants-isbe/GrantDetailClient"

type IsbeFootnotes = { style: "number" | "letter" | "bullet"; items: string[] }

async function getFootnotes(): Promise<IsbeFootnotes> {
  const row = await prisma.systemSetting.findUnique({ where: { key: "isbe_footnotes" } })
  if (!row) return { style: "number", items: [] }
  try {
    return JSON.parse(row.value) as IsbeFootnotes
  } catch {
    return { style: "number", items: [] }
  }
}

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

  const footnotes = await getFootnotes()

  // Fetch cash entries
  const rawCashEntries = await prisma.cashEntry.findMany({
    where: { contractId },
    orderBy: [{ accountingPeriodDate: "asc" }, { createdAt: "asc" }],
  })

  const cashEntries: CashEntry[] = rawCashEntries.map((e) => ({
    id: e.id,
    contractId: e.contractId,
    fiscalYear: e.fiscalYear,
    invoiceNo: e.invoiceNo,
    claimPeriod: e.claimPeriod,
    accountingPeriodDate: e.accountingPeriodDate?.toISOString() ?? null,
    claimedAmount: e.claimedAmount != null ? String(e.claimedAmount) : null,
    cashReceipts: e.cashReceipts != null ? String(e.cashReceipts) : null,
    advanceOffset: e.advanceOffset != null ? String(e.advanceOffset) : null,
    comments: e.comments,
    createdById: e.createdById,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }))

  const decStr = (v: unknown) => (v != null ? String(v) : null)
  const dtStr = (v: Date | null) => v?.toISOString() ?? null

  const detail: ContractDetail = {
    ...contract,
    commitmentAmount: decStr(contract.commitmentAmount),
    arAmount: decStr(contract.arAmount),
    isbeVoucheredToDate: decStr(contract.isbeVoucheredToDate),
    isbeOutstandingObligs: decStr(contract.isbeOutstandingObligs),
    isbeCarryover: decStr(contract.isbeCarryover),
    reconciliationAdjustments: contract.reconciliationAdjustments ?? null,
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
      cashEntries={cashEntries}
      isbeFootnotes={footnotes}
    />
  )
}
