import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user.isSuperAdmin) {
    return new NextResponse("Forbidden", { status: 403 })
  }
  return null
}

// PUT /api/admin/users/[userId]/roles — replace user's role
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const deny = await requireSuperAdmin()
  if (deny) return deny

  const { userId } = await params
  const { roleId } = await req.json()

  // Delete existing roles then assign the new one
  await prisma.userRole.deleteMany({ where: { userId } })

  if (roleId) {
    await prisma.userRole.create({ data: { userId, roleId } })
  }

  return NextResponse.json({ ok: true })
}
