import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function resolveAccess(contractId: string) {
  const session = await auth()
  if (!session?.user) return { error: new NextResponse("Unauthorized", { status: 401 }) }

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      assignments: { select: { userId: true, role: true } },
    },
  })
  if (!contract) return { error: new NextResponse("Not found", { status: 404 }) }

  const isDirector =
    session.user.isSuperAdmin || session.user.permissions.includes("grants_isbe:manage")

  const assignment = contract.assignments.find((a) => a.userId === session.user.id)
  const canView = isDirector || !!assignment
  const canEdit = isDirector || assignment?.role === "editor"

  if (!canView) return { error: new NextResponse("Forbidden", { status: 403 }) }

  return { session, isDirector, canEdit }
}

function serializeEntry(entry: Record<string, unknown>) {
  return {
    ...entry,
    claimedAmount: entry.claimedAmount != null ? String(entry.claimedAmount) : null,
    cashReceipts: entry.cashReceipts != null ? String(entry.cashReceipts) : null,
    advanceOffset: entry.advanceOffset != null ? String(entry.advanceOffset) : null,
  }
}

// GET /api/grants-isbe/[contractId]/cash
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params
  const result = await resolveAccess(contractId)
  if ("error" in result) return result.error

  const entries = await prisma.cashEntry.findMany({
    where: { contractId },
    orderBy: [{ accountingPeriodDate: "asc" }, { createdAt: "asc" }],
  })

  return NextResponse.json(entries.map(serializeEntry))
}

// POST /api/grants-isbe/[contractId]/cash
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params
  const result = await resolveAccess(contractId)
  if ("error" in result) return result.error
  if (!result.canEdit) return new NextResponse("Forbidden", { status: 403 })

  const body = await req.json()

  const entry = await prisma.cashEntry.create({
    data: {
      contractId,
      fiscalYear: Number(body.fiscalYear),
      invoiceNo: body.invoiceNo || null,
      claimPeriod: body.claimPeriod || null,
      accountingPeriodDate: body.accountingPeriodDate
        ? new Date(body.accountingPeriodDate)
        : null,
      claimedAmount: body.claimedAmount != null ? body.claimedAmount : null,
      cashReceipts: body.cashReceipts != null ? body.cashReceipts : null,
      advanceOffset: body.advanceOffset != null ? body.advanceOffset : null,
      comments: body.comments || null,
      createdById: result.session.user.id,
    },
  })

  return NextResponse.json(serializeEntry(entry as unknown as Record<string, unknown>), {
    status: 201,
  })
}
