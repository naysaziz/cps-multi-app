import { prisma } from "@/lib/prisma"
import RolesClient from "./RolesClient"

export default async function RolesPage() {
  const roles = await prisma.role.findMany({
    orderBy: { displayName: "asc" },
    include: {
      rolePermissions: {
        include: { permission: true },
      },
    },
  })

  const permissions = await prisma.permission.findMany({
    orderBy: [{ resource: "asc" }, { action: "asc" }],
  })

  const rolesData = roles.map((r) => ({
    id: r.id,
    name: r.name,
    displayName: r.displayName,
    description: r.description,
    isSystem: r.isSystem,
    permissions: r.rolePermissions.map((rp) => ({
      id: rp.permission.id,
      resource: rp.permission.resource,
      action: rp.permission.action,
    })),
  }))

  return <RolesClient roles={rolesData} allPermissions={permissions} />
}
