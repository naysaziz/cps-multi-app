import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function isGrantsEditor(
  user: { isSuperAdmin: boolean; permissions: string[] } | undefined
) {
  return (
    user?.isSuperAdmin ||
    user?.permissions.includes("grants_isbe:edit") ||
    user?.permissions.includes("grants_isbe:manage")
  )
}

// GET /api/grants-isbe — list contracts
// Directors (grants_isbe:edit) see all; coordinators see only assigned
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const canViewAll = isGrantsEditor(session?.user)

  const contracts = await prisma.contract.findMany({
    where: canViewAll
      ? undefined
      : {
          assignments: {
            some: { userId: session.user.id },
          },
        },
    include: {
      assignments: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      fsgReports: { select: { id: true, period: true, uploadedAt: true } },
      budgetUploads: { select: { id: true, fiscalYear: true, uploadedAt: true } },
    },
    orderBy: [{ fiscalYear: "desc" }, { grantName: "asc" }],
  })

  return NextResponse.json(contracts)
}

// POST /api/grants-isbe — bulk import contracts from master list
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!isGrantsEditor(session?.user)) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const body = await req.json()
  const { contracts } = body as {
    contracts: {
      contractNo: string
      grantName: string
      fundingSource?: string
      grantValues: string[]
      batchCode?: string
      fund?: string
      unit?: string
      revenueAccount?: string
      aln?: string
      programPeriod?: string
      projectStartDate?: string
      projectEndDate?: string
      completionReportDate?: string
      finalReportDate?: string
      commitmentAmount?: number
      cpsBudgetPerson?: string
      isbeContactPerson?: string
      isbePhone?: string
      isbeFax?: string
      agencyLocation?: string
      isbeContactDirectoryUrl?: string
      fiscalYear: number
    }[]
  }

  if (!Array.isArray(contracts) || contracts.length === 0) {
    return NextResponse.json({ error: "contracts array is required" }, { status: 400 })
  }

  // Upsert all contracts — update if contractNo exists, create if not
  const results = await Promise.allSettled(
    contracts.map((c) =>
      prisma.contract.upsert({
        where: { contractNo: c.contractNo },
        update: {
          grantName: c.grantName,
          fundingSource: c.fundingSource ?? "Illinois State Board of Education",
          grantValues: c.grantValues,
          batchCode: c.batchCode,
          fund: c.fund,
          unit: c.unit,
          revenueAccount: c.revenueAccount,
          aln: c.aln,
          programPeriod: c.programPeriod,
          projectStartDate: c.projectStartDate ? new Date(c.projectStartDate) : null,
          projectEndDate: c.projectEndDate ? new Date(c.projectEndDate) : null,
          completionReportDate: c.completionReportDate
            ? new Date(c.completionReportDate)
            : null,
          finalReportDate: c.finalReportDate ? new Date(c.finalReportDate) : null,
          commitmentAmount: c.commitmentAmount,
          cpsBudgetPerson: c.cpsBudgetPerson,
          isbeContactPerson: c.isbeContactPerson,
          isbePhone: c.isbePhone,
          isbeFax: c.isbeFax,
          agencyLocation: c.agencyLocation,
          isbeContactDirectoryUrl: c.isbeContactDirectoryUrl,
          fiscalYear: c.fiscalYear,
        },
        create: {
          contractNo: c.contractNo,
          grantName: c.grantName,
          fundingSource: c.fundingSource ?? "Illinois State Board of Education",
          grantValues: c.grantValues,
          batchCode: c.batchCode,
          fund: c.fund,
          unit: c.unit,
          revenueAccount: c.revenueAccount,
          aln: c.aln,
          programPeriod: c.programPeriod,
          projectStartDate: c.projectStartDate ? new Date(c.projectStartDate) : null,
          projectEndDate: c.projectEndDate ? new Date(c.projectEndDate) : null,
          completionReportDate: c.completionReportDate
            ? new Date(c.completionReportDate)
            : null,
          finalReportDate: c.finalReportDate ? new Date(c.finalReportDate) : null,
          commitmentAmount: c.commitmentAmount,
          cpsBudgetPerson: c.cpsBudgetPerson,
          isbeContactPerson: c.isbeContactPerson,
          isbePhone: c.isbePhone,
          isbeFax: c.isbeFax,
          agencyLocation: c.agencyLocation,
          isbeContactDirectoryUrl: c.isbeContactDirectoryUrl,
          fiscalYear: c.fiscalYear,
        },
      })
    )
  )

  const succeeded = results.filter((r) => r.status === "fulfilled").length
  const failed = results.filter((r) => r.status === "rejected").length

  return NextResponse.json({ imported: succeeded, failed }, { status: 201 })
}
