"use client"

import { useState } from "react"
import { X } from "lucide-react"

type Role = { id: string; name: string; displayName: string }

type Props = {
  allRoles: Role[]
  onClose: () => void
  onSuccess: () => void
}

export default function InviteUserModal({ allRoles, onClose, onSuccess }: Props) {
  const [email, setEmail] = useState("")
  const [roleId, setRoleId] = useState(allRoles[0]?.id ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, roleId }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Something went wrong")
      return
    }

    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-charcoal">Add User</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-silver-light text-charcoal-muted cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1.5">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@cps.edu"
              className="w-full px-3 py-2 text-sm border border-silver-border rounded-lg focus:outline-none focus:border-cobalt"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal mb-1.5">
              Role
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-silver-border rounded-lg focus:outline-none focus:border-cobalt bg-white cursor-pointer"
            >
              {allRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.displayName}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-danger text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <p className="text-charcoal-muted text-xs">
            The user will be pre-registered and can sign in with their Google account.
          </p>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-charcoal-mid border border-silver-border rounded-lg hover:bg-silver-light transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium bg-cobalt text-white rounded-lg hover:bg-cobalt-dark transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Adding..." : "Add User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
