"use client"

import { useState } from "react"
import { RoleWithPermissions } from "@/types"
import { ChevronDown, ChevronUp, Lock } from "lucide-react"
import PermissionToggle from "./PermissionToggle"

type Permission = { id: string; resource: string; action: string }

type Props = {
  role: RoleWithPermissions
  allPermissions: Permission[]
  onUpdate: () => void
}

const RESOURCE_LABELS: Record<string, string> = {
  admin_users: "User Management",
  admin_roles: "Role Management",
  admin_apps: "App Management",
  grants_isbe: "ISBE Grants",
  grants_non_isbe: "Non-ISBE Grants",
  payroll: "Payroll Efficiencies",
  payroll_final: "Payroll Final Payout",
}

const ACTION_LABELS: Record<string, string> = {
  view: "View",
  edit: "Edit",
  manage: "Manage",
  delete: "Delete",
}

export default function RoleCard({ role, allPermissions, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  const enabledSet = new Set(
    role.permissions.map((p) => `${p.resource}:${p.action}`)
  )

  // Group permissions by resource
  const resources = [...new Set(allPermissions.map((p) => p.resource))].sort()

  async function toggle(permissionId: string, resource: string, action: string) {
    const key = `${resource}:${action}`
    const isEnabled = enabledSet.has(key)
    setSaving(key)

    await fetch(`/api/admin/roles/${role.id}/permissions`, {
      method: isEnabled ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissionId }),
    })

    setSaving(null)
    onUpdate()
  }

  return (
    <div className="bg-white rounded-xl border border-silver-border shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          {role.isSystem && (
            <Lock size={13} className="text-charcoal-muted shrink-0" />
          )}
          <div className="text-left">
            <p className="font-semibold text-charcoal text-sm">{role.displayName}</p>
            {role.description && (
              <p className="text-charcoal-muted text-xs mt-0.5">{role.description}</p>
            )}
          </div>
          <span className="ml-2 px-2 py-0.5 bg-cobalt-50 text-cobalt text-xs rounded-full font-medium">
            {role.permissions.length} permissions
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-charcoal-muted shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-charcoal-muted shrink-0" />
        )}
      </button>

      {/* Permissions grid */}
      {expanded && (
        <div className="border-t border-silver-border px-5 py-4">
          <div className="space-y-4">
            {resources.map((resource) => {
              const resourcePerms = allPermissions.filter(
                (p) => p.resource === resource
              )
              return (
                <div key={resource}>
                  <p className="text-xs font-semibold text-charcoal-mid uppercase tracking-wide mb-2">
                    {RESOURCE_LABELS[resource] ?? resource}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {resourcePerms.map((perm) => (
                      <PermissionToggle
                        key={perm.id}
                        label={ACTION_LABELS[perm.action] ?? perm.action}
                        enabled={enabledSet.has(`${perm.resource}:${perm.action}`)}
                        disabled={role.isSystem || saving === `${perm.resource}:${perm.action}`}
                        onChange={() => toggle(perm.id, perm.resource, perm.action)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
