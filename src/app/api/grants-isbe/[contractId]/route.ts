import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function resolveAccess(contractId: string) {
  const session = await auth()
  if (!session?.user) return { error: new NextResponse("Unauthorized", { status: 401 }) }

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      assignments: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      fsgReports: true,
      budgetUploads: true,
    },
  })

  if (!contract) return { error: new NextResponse("Not found", { status: 404 }) }

  const isDirector =
    session.user.isSuperAdmin ||
    session.user.permissions.includes("grants_isbe:manage")

  const assignment = contract.assignments.find((a) => a.userId === session.user.id)
  const canView = isDirector || !!assignment
  const canEdit = isDirector || assignment?.role === "editor"

  if (!canView) return { error: new NextResponse("Forbidden", { status: 403 }) }

  return { session, contract, canEdit, isDirector }
}

// GET /api/grants-isbe/[contractId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params
  const result = await resolveAccess(contractId)
  if ("error" in result) return result.error

  return NextResponse.json({ ...result.contract, canEdit: result.canEdit })
}

// PATCH /api/grants-isbe/[contractId] — update contract metadata
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params
  const result = await resolveAccess(contractId)
  if ("error" in result) return result.error
  if (!result.canEdit) return new NextResponse("Forbidden", { status: 403 })

  const body = await req.json()

  const updated = await prisma.contract.update({
    where: { id: contractId },
    data: {
      grantName: body.grantName,
      batchCode: body.batchCode,
      fund: body.fund,
      unit: body.unit,
      revenueAccount: body.revenueAccount,
      aln: body.aln,
      programPeriod: body.programPeriod,
      projectStartDate: body.projectStartDate ? new Date(body.projectStartDate) : undefined,
      projectEndDate: body.projectEndDate ? new Date(body.projectEndDate) : undefined,
      completionReportDate: body.completionReportDate
        ? new Date(body.completionReportDate)
        : undefined,
      finalReportDate: body.finalReportDate ? new Date(body.finalReportDate) : undefined,
      commitmentAmount: body.commitmentAmount,
      cpsBudgetPerson: body.cpsBudgetPerson,
      isbeContactPerson: body.isbeContactPerson,
      isbePhone: body.isbePhone,
      isbeFax: body.isbeFax,
      agencyLocation: body.agencyLocation,
      isbeContactDirectoryUrl: body.isbeContactDirectoryUrl,
      isActive: body.isActive,
    },
  })

  return NextResponse.json(updated)
}
