"use client"

import { useState } from "react"
import { UserWithRoles } from "@/types"
import { MoreHorizontal, CheckCircle, XCircle } from "lucide-react"

type Role = { id: string; name: string; displayName: string }

type Props = {
  users: UserWithRoles[]
  allRoles: Role[]
  onUpdate: () => void
}

export default function UserTable({ users, allRoles, onUpdate }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function toggleActive(userId: string, isActive: boolean) {
    setLoadingId(userId)
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    })
    setLoadingId(null)
    onUpdate()
  }

  async function updateRole(userId: string, roleId: string) {
    setLoadingId(userId)
    await fetch(`/api/admin/users/${userId}/roles`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId }),
    })
    setLoadingId(null)
    onUpdate()
  }

  if (users.length === 0) {
    return (
      <div className="py-16 text-center text-charcoal-muted text-sm">
        No users found.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-silver-border">
            <th className="text-left px-5 py-3 text-xs font-semibold text-charcoal-muted uppercase tracking-wide">
              User
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-charcoal-muted uppercase tracking-wide">
              Role
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-charcoal-muted uppercase tracking-wide">
              Status
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-charcoal-muted uppercase tracking-wide">
              Joined
            </th>
            <th className="px-5 py-3 w-10" />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b border-silver-border last:border-0 hover:bg-silver-light transition-colors"
            >
              {/* User */}
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cobalt-light flex items-center justify-center shrink-0">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name ?? ""}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-cobalt text-xs font-semibold">
                        {(user.name ?? user.email ?? "U")[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-charcoal">{user.name ?? "—"}</p>
                    <p className="text-charcoal-muted text-xs">{user.email}</p>
                  </div>
                </div>
              </td>

              {/* Role */}
              <td className="px-5 py-3.5">
                <select
                  value={user.roles[0]?.id ?? ""}
                  onChange={(e) => updateRole(user.id, e.target.value)}
                  disabled={loadingId === user.id}
                  className="text-sm border border-silver-border rounded-md px-2 py-1 bg-white focus:outline-none focus:border-cobalt disabled:opacity-50 cursor-pointer"
                >
                  <option value="">No role</option>
                  {allRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.displayName}
                    </option>
                  ))}
                </select>
              </td>

              {/* Status */}
              <td className="px-5 py-3.5">
                {user.isActive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-success text-xs font-medium rounded-full">
                    <CheckCircle size={11} />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-danger text-xs font-medium rounded-full">
                    <XCircle size={11} />
                    Inactive
                  </span>
                )}
              </td>

              {/* Joined */}
              <td className="px-5 py-3.5 text-charcoal-muted text-xs">
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>

              {/* Actions */}
              <td className="px-5 py-3.5">
                <button
                  onClick={() => toggleActive(user.id, user.isActive)}
                  disabled={loadingId === user.id}
                  className="p-1.5 text-charcoal-muted hover:text-charcoal rounded hover:bg-silver-light transition-colors disabled:opacity-50 cursor-pointer"
                  title={user.isActive ? "Deactivate user" : "Activate user"}
                >
                  <MoreHorizontal size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
