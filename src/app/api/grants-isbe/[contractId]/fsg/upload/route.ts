import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseFsgPdf } from "@/lib/fsg-parser"

async function resolveEditAccess(contractId: string) {
  const session = await auth()
  if (!session?.user) return { error: new NextResponse("Unauthorized", { status: 401 }) }

  const isDirector =
    session.user.isSuperAdmin ||
    session.user.permissions.includes("grants_isbe:manage")

  if (!isDirector) {
    const assignment = await prisma.grantAssignment.findUnique({
      where: { contractId_userId: { contractId, userId: session.user.id } },
    })
    if (assignment?.role !== "editor") {
      return { error: new NextResponse("Forbidden", { status: 403 }) }
    }
  }

  return { session }
}

// POST /api/grants-isbe/[contractId]/fsg/upload
// Accepts multipart: file (PDF) + period ("current"|"next")
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params
  const result = await resolveEditAccess(contractId)
  if ("error" in result) return result.error

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const period = formData.get("period") as string | null

  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 })
  if (!period || !["current", "next"].includes(period)) {
    return NextResponse.json({ error: "period must be 'current' or 'next'" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Parse the FSG PDF using Claude AI vision
  const parsedData = await parseFsgPdf(buffer)

  const report = await prisma.fsgReport.upsert({
    where: { contractId_period: { contractId, period } },
    update: {
      parsedData,
      uploadedById: result.session.user.id,
      uploadedAt: new Date(),
      updatedAt: new Date(),
    },
    create: {
      contractId,
      period,
      parsedData,
      uploadedById: result.session.user.id,
    },
  })

  return NextResponse.json(report, { status: 201 })
}
