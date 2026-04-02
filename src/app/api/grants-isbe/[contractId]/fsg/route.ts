import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function isDirectorUser(user: { isSuperAdmin: boolean; permissions: string[] }) {
  return (
    user.isSuperAdmin ||
    user.permissions.includes("grants_isbe:manage")
  )
}

async function resolveReadAccess(contractId: string) {
  const session = await auth()
  if (!session?.user) return { error: new NextResponse("Unauthorized", { status: 401 }) }

  if (isDirectorUser(session.user)) return { session }

  const assignment = await prisma.grantAssignment.findUnique({
    where: { contractId_userId: { contractId, userId: session.user.id } },
  })
  if (!assignment) return { error: new NextResponse("Forbidden", { status: 403 }) }

  return { session }
}

async function resolveEditAccess(contractId: string) {
  const session = await auth()
  if (!session?.user) return { error: new NextResponse("Unauthorized", { status: 401 }) }

  if (!isDirectorUser(session.user)) {
    const assignment = await prisma.grantAssignment.findUnique({
      where: { contractId_userId: { contractId, userId: session.user.id } },
    })
    if (assignment?.role !== "editor") {
      return { error: new NextResponse("Forbidden", { status: 403 }) }
    }
  }

  return { session }
}

// GET /api/grants-isbe/[contractId]/fsg — list FSG reports for a contract
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params
  const result = await resolveReadAccess(contractId)
  if ("error" in result) return result.error

  const reports = await prisma.fsgReport.findMany({
    where: { contractId },
    include: { uploadedBy: { select: { name: true, email: true } } },
    orderBy: { uploadedAt: "desc" },
  })

  return NextResponse.json(reports)
}

// POST /api/grants-isbe/[contractId]/fsg — save parsed FSG data
// Client sends: { period: "current"|"next", parsedData: {...} }
// PDF upload + AI parsing happens client-side via /api/grants-isbe/parse-fsg
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params
  const result = await resolveEditAccess(contractId)
  if ("error" in result) return result.error

  const { period, parsedData, pdfStorageKey } = await req.json()

  if (!period || !["current", "next"].includes(period)) {
    return NextResponse.json({ error: "period must be 'current' or 'next'" }, { status: 400 })
  }

  const report = await prisma.fsgReport.upsert({
    where: { contractId_period: { contractId, period } },
    update: {
      parsedData,
      pdfStorageKey,
      uploadedById: result.session.user.id,
      uploadedAt: new Date(),
      updatedAt: new Date(),
    },
    create: {
      contractId,
      period,
      parsedData,
      pdfStorageKey,
      uploadedById: result.session.user.id,
    },
  })

  return NextResponse.json(report, { status: 201 })
}

// DELETE /api/grants-isbe/[contractId]/fsg?period=current
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params
  const result = await resolveEditAccess(contractId)
  if ("error" in result) return result.error

  const period = req.nextUrl.searchParams.get("period")
  if (!period) return NextResponse.json({ error: "period required" }, { status: 400 })

  await prisma.fsgReport.delete({
    where: { contractId_period: { contractId, period } },
  })

  return new NextResponse(null, { status: 204 })
}
