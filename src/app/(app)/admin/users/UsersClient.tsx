"use client"

import { useState, useTransition } from "react"
import { UserWithRoles } from "@/types"
import { UserPlus, Search } from "lucide-react"
import UserTable from "@/components/admin/UserTable"
import InviteUserModal from "@/components/admin/InviteUserModal"
import { useRouter } from "next/navigation"

type Role = { id: string; name: string; displayName: string }

type Props = {
  users: UserWithRoles[]
  allRoles: Role[]
}

export default function UsersClient({ users, allRoles }: Props) {
  const [search, setSearch] = useState("")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const filtered = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.name?.toLowerCase().includes(search.toLowerCase())
  )

  function refresh() {
    startTransition(() => router.refresh())
  }

  return (
    <div className="bg-white rounded-xl border border-silver-border shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-silver-border">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-muted"
          />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 text-sm border border-silver-border rounded-lg bg-silver-light focus:outline-none focus:border-cobalt w-60"
          />
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cobalt text-white text-sm font-medium rounded-lg hover:bg-cobalt-dark transition-colors cursor-pointer"
        >
          <UserPlus size={14} />
          Add User
        </button>
      </div>

      <UserTable users={filtered} allRoles={allRoles} onUpdate={refresh} />

      {inviteOpen && (
        <InviteUserModal
          allRoles={allRoles}
          onClose={() => setInviteOpen(false)}
          onSuccess={() => {
            setInviteOpen(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}
