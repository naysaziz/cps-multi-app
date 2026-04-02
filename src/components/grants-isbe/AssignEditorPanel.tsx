"use client"

import { useState } from "react"

type Assignment = {
  id: string
  role: string
  user: { id: string; name: string | null; email: string | null }
}

type Props = {
  contractId: string
  currentAssignments: Assignment[]
  allUsers: { id: string; name: string | null; email: string | null }[]
  onClose: () => void
  currentUserId: string
}

export default function AssignEditorPanel({
  contractId,
  currentAssignments,
  allUsers,
  onClose,
}: Props) {
  const [selectedUserId, setSelectedUserId] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentEditor = currentAssignments.find((a) => a.role === "editor")

  async function assignEditor() {
    if (!selectedUserId) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/grants-isbe/${contractId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, role: "editor" }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to assign")
      }

      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-charcoal">Reassign Editor</h2>
          <button onClick={onClose} className="text-charcoal-muted hover:text-charcoal text-xl leading-none">
            ×
          </button>
        </div>

        {currentEditor && (
          <p className="text-sm text-charcoal-muted mb-4">
            Current editor:{" "}
            <span className="font-medium text-charcoal">
              {currentEditor.user.name ?? currentEditor.user.email}
            </span>
          </p>
        )}

        <label className="block text-sm font-medium text-charcoal mb-1.5">
          Assign to
        </label>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-cobalt/30 mb-4"
        >
          <option value="">Select a coordinator…</option>
          {allUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name ?? u.email}
            </option>
          ))}
        </select>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-charcoal-muted hover:text-charcoal border border-border rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={assignEditor}
            disabled={!selectedUserId || saving}
            className="px-4 py-2 text-sm font-medium bg-cobalt text-white rounded-md hover:bg-cobalt-dark disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Assign Editor"}
          </button>
        </div>
      </div>
    </div>
  )
}
