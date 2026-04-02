import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/grants-isbe/[contractId]/assign
// Directors only — reassign the editor for a contract
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params
  const session = await auth()

  const isDirector =
    session?.user.isSuperAdmin ||
    session?.user.permissions.includes("grants_isbe:edit") ||
    session?.user.permissions.includes("grants_isbe:manage")

  if (!isDirector) return new NextResponse("Forbidden", { status: 403 })

  const { userId, role } = await req.json() as { userId: string; role: "editor" | "viewer" }

  if (!userId || !["editor", "viewer"].includes(role)) {
    return NextResponse.json({ error: "userId and role (editor|viewer) required" }, { status: 400 })
  }

  // Validate both entities exist before touching assignments
  const [contract, user] = await Promise.all([
    prisma.contract.findUnique({ where: { id: contractId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
  ])
  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // If assigning a new editor, demote the previous editor to viewer
  if (role === "editor") {
    await prisma.grantAssignment.updateMany({
      where: { contractId, role: "editor" },
      data: { role: "viewer" },
    })
  }

  const assignment = await prisma.grantAssignment.upsert({
    where: { contractId_userId: { contractId, userId } },
    update: { role },
    create: { contractId, userId, role },
  })

  return NextResponse.json(assignment)
}

// DELETE /api/grants-isbe/[contractId]/assign?userId=xxx
// Directors only — remove a user's access to a contract
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params
  const session = await auth()

  const isDirector =
    session?.user.isSuperAdmin ||
    session?.user.permissions.includes("grants_isbe:edit") ||
    session?.user.permissions.includes("grants_isbe:manage")

  if (!isDirector) return new NextResponse("Forbidden", { status: 403 })

  const userId = req.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  // deleteMany is idempotent — won't 500 if assignment doesn't exist
  await prisma.grantAssignment.deleteMany({
    where: { contractId, userId },
  })

  return new NextResponse(null, { status: 204 })
}
