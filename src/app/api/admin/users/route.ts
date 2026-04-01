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

// GET /api/admin/users — list all users
export async function GET() {
  const deny = await requireSuperAdmin()
  if (deny) return deny

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { userRoles: { include: { role: true } } },
  })

  return NextResponse.json(users)
}

// POST /api/admin/users — create/pre-register a user
export async function POST(req: NextRequest) {
  const deny = await requireSuperAdmin()
  if (deny) return deny

  const { email, roleId } = await req.json()

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    )
  }

  const user = await prisma.user.create({
    data: {
      email,
      userRoles: roleId
        ? { create: { roleId } }
        : undefined,
    },
  })

  return NextResponse.json(user, { status: 201 })
}
