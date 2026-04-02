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

// GET /api/admin/settings — return all system settings as { key: value } map
export async function GET() {
  const deny = await requireSuperAdmin()
  if (deny) return deny

  const rows = await prisma.systemSetting.findMany()
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return NextResponse.json(settings)
}

// PATCH /api/admin/settings — upsert one or more settings
// Body: { key: value, ... }
export async function PATCH(req: NextRequest) {
  const deny = await requireSuperAdmin()
  if (deny) return deny

  const body = await req.json() as Record<string, string>

  await Promise.all(
    Object.entries(body).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  )

  const rows = await prisma.systemSetting.findMany()
  return NextResponse.json(Object.fromEntries(rows.map((r) => [r.key, r.value])))
}
