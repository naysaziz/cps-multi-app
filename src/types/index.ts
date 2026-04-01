export type AppTile = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  route: string
  isActive: boolean
  sortOrder: number
  requiredPermission: string | null
}

export type UserWithRoles = {
  id: string
  name: string | null
  email: string | null
  image: string | null
  isActive: boolean
  createdAt: Date
  roles: { id: string; name: string; displayName: string }[]
}

export type RoleWithPermissions = {
  id: string
  name: string
  displayName: string
  description: string | null
  isSystem: boolean
  permissions: { id: string; resource: string; action: string }[]
}
