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

// PATCH /api/admin/users/[userId] — update isActive
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const deny = await requireSuperAdmin()
  if (deny) return deny

  const { userId } = await params
  const body = await req.json()

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive: body.isActive },
  })

  return NextResponse.json(user)
}

// DELETE /api/admin/users/[userId] — hard delete (use with care)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const deny = await requireSuperAdmin()
  if (deny) return deny

  const { userId } = await params

  await prisma.user.delete({ where: { id: userId } })

  return new NextResponse(null, { status: 204 })
}
