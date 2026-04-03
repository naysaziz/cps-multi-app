import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function resolveEditAccess(contractId: string) {
  const session = await auth()
  if (!session?.user) return { error: new NextResponse("Unauthorized", { status: 401 }) }

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { assignments: { select: { userId: true, role: true } } },
  })
  if (!contract) return { error: new NextResponse("Not found", { status: 404 }) }

  const isDirector =
    session.user.isSuperAdmin || session.user.permissions.includes("grants_isbe:manage")

  const assignment = contract.assignments.find((a) => a.userId === session.user.id)
  const canEdit = isDirector || assignment?.role === "editor"

  if (!canEdit) return { error: new NextResponse("Forbidden", { status: 403 }) }

  return { canEdit }
}

function serializeEntry(entry: Record<string, unknown>) {
  return {
    ...entry,
    claimedAmount: entry.claimedAmount != null ? String(entry.claimedAmount) : null,
    cashReceipts: entry.cashReceipts != null ? String(entry.cashReceipts) : null,
    advanceOffset: entry.advanceOffset != null ? String(entry.advanceOffset) : null,
  }
}

// PATCH /api/grants-isbe/[contractId]/cash/[entryId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string; entryId: string }> }
) {
  const { contractId, entryId } = await params
  const result = await resolveEditAccess(contractId)
  if ("error" in result) return result.error

  const body = await req.json()

  const entry = await prisma.cashEntry.update({
    where: { id: entryId, contractId },
    data: {
      fiscalYear: body.fiscalYear != null ? Number(body.fiscalYear) : undefined,
      invoiceNo: body.invoiceNo !== undefined ? body.invoiceNo || null : undefined,
      claimPeriod: body.claimPeriod !== undefined ? body.claimPeriod || null : undefined,
      accountingPeriodDate:
        body.accountingPeriodDate !== undefined
          ? body.accountingPeriodDate
            ? new Date(body.accountingPeriodDate)
            : null
          : undefined,
      claimedAmount: body.claimedAmount !== undefined ? body.claimedAmount : undefined,
      cashReceipts: body.cashReceipts !== undefined ? body.cashReceipts : undefined,
      advanceOffset: body.advanceOffset !== undefined ? body.advanceOffset : undefined,
      comments: body.comments !== undefined ? body.comments || null : undefined,
    },
  })

  return NextResponse.json(serializeEntry(entry as unknown as Record<string, unknown>))
}

// DELETE /api/grants-isbe/[contractId]/cash/[entryId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string; entryId: string }> }
) {
  const { contractId, entryId } = await params
  const result = await resolveEditAccess(contractId)
  if ("error" in result) return result.error

  await prisma.cashEntry.delete({ where: { id: entryId, contractId } })

  return new NextResponse(null, { status: 204 })
}
