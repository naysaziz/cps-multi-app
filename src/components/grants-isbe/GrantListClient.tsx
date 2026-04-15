"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ContractSummary } from "@/types"

type Props = {
  contracts: ContractSummary[]
  isDirector: boolean
  currentUserId: string
}

function statusBadge(contract: ContractSummary) {
  const hasBudget = contract.budgetUploads.length > 0
  const hasFsg = contract.fsgReports.length > 0
  const batchPending = contract.batchCode === "Need" || !contract.batchCode

  if (!hasBudget && !hasFsg) return { label: "Not Started", color: "bg-gray-100 text-gray-600" }
  if (batchPending) return { label: "Batch Pending", color: "bg-yellow-100 text-yellow-700" }
  if (hasBudget && hasFsg) return { label: "Up to Date", color: "bg-green-100 text-green-700" }
  if (hasBudget) return { label: "Budget Only", color: "bg-blue-100 text-blue-700" }
  return { label: "FSG Only", color: "bg-purple-100 text-purple-700" }
}

export default function GrantListClient({ contracts, isDirector, currentUserId }: Props) {
  const [search, setSearch] = useState("")
  const [fyFilter, setFyFilter] = useState<string>("all")
  const [accessFilter, setAccessFilter] = useState<"all" | "editor" | "viewer">("all")

  const fiscalYears = useMemo(
    () => [...new Set(contracts.map((c) => c.fiscalYear))].sort((a, b) => b - a),
    [contracts]
  )

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      const matchFy = fyFilter === "all" || c.fiscalYear === parseInt(fyFilter)
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        c.grantName.toLowerCase().includes(q) ||
        c.contractNo.toLowerCase().includes(q) ||
        c.grantValues.some((v) => v.includes(q)) ||
        (c.batchCode?.toLowerCase().includes(q) ?? false)
      const myRole = c.assignments.find((a) => a.user.id === currentUserId)?.role
      const matchAccess =
        isDirector ||
        accessFilter === "all" ||
        myRole === accessFilter
      return matchFy && matchSearch && matchAccess
    })
  }, [contracts, search, fyFilter, accessFilter, currentUserId, isDirector])

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input
          type="text"
          placeholder="Search by name, contract no, or grant number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-cobalt/30"
        />
        <select
          value={fyFilter}
          onChange={(e) => setFyFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-cobalt/30"
        >
          <option value="all">All Years</option>
          {fiscalYears.map((fy) => (
            <option key={fy} value={fy}>
              FY{fy}
            </option>
          ))}
        </select>
        {!isDirector && (
          <select
            value={accessFilter}
            onChange={(e) => setAccessFilter(e.target.value as "all" | "editor" | "viewer")}
            className="px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-cobalt/30"
          >
            <option value="all">All Access</option>
            <option value="editor">Can Edit</option>
            <option value="viewer">View Only</option>
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-charcoal-muted">Grant Name</th>
              <th className="text-left px-4 py-3 font-medium text-charcoal-muted">Contract No</th>
              <th className="text-left px-4 py-3 font-medium text-charcoal-muted">Grant Values</th>
              <th className="text-left px-4 py-3 font-medium text-charcoal-muted">FY</th>
              {isDirector && (
                <th className="text-left px-4 py-3 font-medium text-charcoal-muted">Coordinator</th>
              )}
              <th className="text-left px-4 py-3 font-medium text-charcoal-muted">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={isDirector ? 7 : 6}
                  className="px-4 py-10 text-center text-charcoal-muted"
                >
                  No grants found.
                </td>
              </tr>
            )}
            {filtered.map((contract) => {
              const badge = statusBadge(contract)
              const editor = contract.assignments.find((a) => a.role === "editor")
              return (
                <tr key={contract.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-charcoal max-w-xs">
                    <span className="line-clamp-2">{contract.grantName}</span>
                  </td>
                  <td className="px-4 py-3 text-charcoal-muted font-mono text-xs">
                    {contract.contractNo}
                  </td>
                  <td className="px-4 py-3 text-charcoal-muted">
                    <div className="flex flex-wrap gap-1">
                      {contract.grantValues.map((v) => (
                        <span
                          key={v}
                          className="inline-block px-1.5 py-0.5 bg-cobalt-light text-cobalt text-xs rounded font-mono"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-charcoal-muted">FY{contract.fiscalYear}</td>
                  {isDirector && (
                    <td className="px-4 py-3 text-charcoal-muted">
                      {editor?.user.name ?? editor?.user.email ?? (
                        <span className="italic text-gray-400">Unassigned</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/grants-isbe/${contract.id}`}
                      className="text-cobalt hover:underline text-sm font-medium"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-charcoal-muted mt-3">
        Showing {filtered.length} of {contracts.length} grants
      </p>
    </div>
  )
}
