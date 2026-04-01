import { prisma } from "@/lib/prisma"
import UsersClient from "./UsersClient"

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      userRoles: {
        include: { role: { select: { id: true, name: true, displayName: true } } },
      },
    },
  })

  const roles = await prisma.role.findMany({
    orderBy: { displayName: "asc" },
    select: { id: true, name: true, displayName: true },
  })

  const usersData = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    isActive: u.isActive,
    createdAt: u.createdAt,
    roles: u.userRoles.map((ur) => ur.role),
  }))

  return <UsersClient users={usersData} allRoles={roles} />
}
