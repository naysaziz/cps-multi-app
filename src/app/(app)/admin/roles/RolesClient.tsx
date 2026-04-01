"use client"

import { useTransition } from "react"
import { RoleWithPermissions } from "@/types"
import { useRouter } from "next/navigation"
import RoleCard from "@/components/admin/RoleCard"

type Permission = { id: string; resource: string; action: string }

type Props = {
  roles: RoleWithPermissions[]
  allPermissions: Permission[]
}

export default function RolesClient({ roles, allPermissions }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  function refresh() {
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-4">
      {roles.map((role) => (
        <RoleCard
          key={role.id}
          role={role}
          allPermissions={allPermissions}
          onUpdate={refresh}
        />
      ))}
    </div>
  )
}
