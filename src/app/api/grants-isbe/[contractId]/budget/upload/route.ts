import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseBudgetFile } from "@/lib/budget-parser"

async function resolveEditAccess(contractId: string) {
  const session = await auth()
  if (!session?.user) return { error: new NextResponse("Unauthorized", { status: 401 }) }

  const isDirector =
    session.user.isSuperAdmin ||
    session.user.permissions.includes("grants_isbe:edit") ||
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

// POST /api/grants-isbe/[contractId]/budget/upload
// Accepts multipart: file (Excel/CSV) + fiscalYear
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params
  const result = await resolveEditAccess(contractId)
  if ("error" in result) return result.error

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const fiscalYearRaw = formData.get("fiscalYear") as string | null

  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 })
  if (!fiscalYearRaw) return NextResponse.json({ error: "fiscalYear is required" }, { status: 400 })

  const fiscalYear = parseInt(fiscalYearRaw)
  if (isNaN(fiscalYear)) {
    return NextResponse.json({ error: "fiscalYear must be a number" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const fileName = file.name.toLowerCase()

  let parsedData
  try {
    parsedData = await parseBudgetFile(buffer, fileName)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse file" },
      { status: 400 }
    )
  }

  const upload = await prisma.budgetUpload.upsert({
    where: { contractId_fiscalYear: { contractId, fiscalYear } },
    update: {
      parsedData,
      uploadedById: result.session.user.id,
      uploadedAt: new Date(),
      updatedAt: new Date(),
    },
    create: {
      contractId,
      fiscalYear,
      parsedData,
      uploadedById: result.session.user.id,
    },
  })

  return NextResponse.json(upload, { status: 201 })
}
