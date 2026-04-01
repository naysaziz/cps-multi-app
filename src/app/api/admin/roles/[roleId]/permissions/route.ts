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

// POST — add permission to role
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const deny = await requireSuperAdmin()
  if (deny) return deny

  const { roleId } = await params
  const { permissionId } = await req.json()

  const role = await prisma.role.findUnique({ where: { id: roleId } })
  if (role?.isSystem) {
    return NextResponse.json(
      { error: "System roles cannot be modified" },
      { status: 403 }
    )
  }

  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId, permissionId } },
    create: { roleId, permissionId },
    update: {},
  })

  return NextResponse.json({ ok: true })
}

// DELETE — remove permission from role
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const deny = await requireSuperAdmin()
  if (deny) return deny

  const { roleId } = await params
  const { permissionId } = await req.json()

  const role = await prisma.role.findUnique({ where: { id: roleId } })
  if (role?.isSystem) {
    return NextResponse.json(
      { error: "System roles cannot be modified" },
      { status: 403 }
    )
  }

  await prisma.rolePermission.deleteMany({
    where: { roleId, permissionId },
  })

  return NextResponse.json({ ok: true })
}
