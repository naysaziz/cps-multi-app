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

// GET /api/grants-isbe/[contractId]/budget
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params
  const result = await resolveReadAccess(contractId)
  if ("error" in result) return result.error

  const uploads = await prisma.budgetUpload.findMany({
    where: { contractId },
    include: { uploadedBy: { select: { name: true, email: true } } },
    orderBy: { uploadedAt: "desc" },
  })

  return NextResponse.json(uploads)
}

// POST /api/grants-isbe/[contractId]/budget — save parsed budget data
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params
  const result = await resolveEditAccess(contractId)
  if ("error" in result) return result.error

  const { fiscalYear, parsedData, fileStorageKey } = await req.json()

  if (!fiscalYear) {
    return NextResponse.json({ error: "fiscalYear is required" }, { status: 400 })
  }

  const upload = await prisma.budgetUpload.upsert({
    where: { contractId_fiscalYear: { contractId, fiscalYear } },
    update: {
      parsedData,
      fileStorageKey,
      uploadedById: result.session.user.id,
      uploadedAt: new Date(),
      updatedAt: new Date(),
    },
    create: {
      contractId,
      fiscalYear,
      parsedData,
      fileStorageKey,
      uploadedById: result.session.user.id,
    },
  })

  return NextResponse.json(upload, { status: 201 })
}
