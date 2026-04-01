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

// PATCH /api/admin/apps/[appId] — toggle isActive, update sort order
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const deny = await requireSuperAdmin()
  if (deny) return deny

  const { appId } = await params
  const body = await req.json()

  const app = await prisma.app.update({
    where: { id: appId },
    data: {
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    },
  })

  return NextResponse.json(app)
}
