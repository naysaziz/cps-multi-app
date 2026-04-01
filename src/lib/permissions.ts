export function hasPermission(
  permissions: string[],
  resource: string,
  action: string
): boolean {
  return permissions.includes(`${resource}:${action}`)
}

export function hasAnyPermission(
  permissions: string[],
  resource: string,
  actions: string[]
): boolean {
  return actions.some((action) => hasPermission(permissions, resource, action))
}

export function canAccessApp(
  permissions: string[],
  isSuperAdmin: boolean,
  requiredPermission: string | null
): boolean {
  if (isSuperAdmin) return true
  if (!requiredPermission) return true
  return permissions.includes(requiredPermission)
}
