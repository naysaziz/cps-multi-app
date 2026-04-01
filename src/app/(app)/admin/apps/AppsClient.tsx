"use client"

import { useState } from "react"
import { AppTile } from "@/types"
import { useRouter } from "next/navigation"

type Props = {
  apps: AppTile[]
}

export default function AppsClient({ apps: initialApps }: Props) {
  const [apps, setApps] = useState(initialApps)
  const [saving, setSaving] = useState<string | null>(null)
  const router = useRouter()

  async function toggleActive(app: AppTile) {
    setSaving(app.id)
    const res = await fetch(`/api/admin/apps/${app.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !app.isActive }),
    })
    if (res.ok) {
      setApps((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, isActive: !a.isActive } : a))
      )
      router.refresh()
    }
    setSaving(null)
  }

  return (
    <div className="bg-white rounded-xl border border-silver-border shadow-sm">
      <div className="px-5 py-4 border-b border-silver-border">
        <h2 className="text-sm font-semibold text-charcoal">Dashboard Tiles</h2>
        <p className="text-charcoal-muted text-xs mt-0.5">
          Enable or disable apps visible on the dashboard.
        </p>
      </div>
      <div className="divide-y divide-silver-border">
        {apps.map((app) => (
          <div
            key={app.id}
            className="flex items-center justify-between px-5 py-4"
          >
            <div>
              <p className="text-sm font-medium text-charcoal">{app.name}</p>
              {app.description && (
                <p className="text-xs text-charcoal-muted mt-0.5">
                  {app.description}
                </p>
              )}
              {app.requiredPermission && (
                <p className="text-xs text-charcoal-muted mt-0.5 font-mono">
                  {app.requiredPermission}
                </p>
              )}
            </div>
            <button
              onClick={() => toggleActive(app)}
              disabled={saving === app.id}
              className={`
                relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                transition-colors focus:outline-none disabled:opacity-50
                ${app.isActive ? "bg-cobalt" : "bg-silver"}
              `}
              role="switch"
              aria-checked={app.isActive}
            >
              <span
                className={`
                  pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                  ${app.isActive ? "translate-x-4" : "translate-x-0"}
                `}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
