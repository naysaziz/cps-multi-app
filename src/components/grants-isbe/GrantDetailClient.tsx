"use client"

import { useState } from "react"
import Link from "next/link"
import { ContractDetail } from "@/types"
import GrantInfoTab from "./GrantInfoTab"
import GrantBudgetTab from "./GrantBudgetTab"
import GrantFsgTab from "./GrantFsgTab"
import AssignEditorPanel from "./AssignEditorPanel"

type Tab = "info" | "budget" | "fsg"

type Props = {
  contract: ContractDetail
  allUsers: { id: string; name: string | null; email: string | null }[]
  isDirector: boolean
  currentUserId: string
}

export default function GrantDetailClient({
  contract,
  allUsers,
  isDirector,
  currentUserId,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("info")
  const [showAssign, setShowAssign] = useState(false)

  const editor = contract.assignments.find((a) => a.role === "editor")

  const tabs: { key: Tab; label: string }[] = [
    { key: "info", label: "Info" },
    { key: "budget", label: "Budget" },
    { key: "fsg", label: "FSG Reports" },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Back link */}
      <Link
        href="/grants-isbe"
        className="text-sm text-cobalt hover:underline flex items-center gap-1 mb-6"
      >
        ← All Grants
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">{contract.grantName}</h1>
          <p className="text-charcoal-muted text-sm mt-1 font-mono">{contract.contractNo}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-charcoal-muted">
            {editor?.user.name ?? editor?.user.email ?? "Unassigned"}
          </span>
          {isDirector && (
            <button
              onClick={() => setShowAssign(true)}
              className="text-sm text-cobalt hover:underline"
            >
              {editor ? "Reassign" : "Assign"}
            </button>
          )}
        </div>
      </div>

      {/* Grant value badges */}
      <div className="flex flex-wrap gap-1.5 mb-6 mt-2">
        {contract.grantValues.map((v) => (
          <span
            key={v}
            className="px-2 py-0.5 bg-cobalt-light text-cobalt text-xs font-mono rounded"
          >
            {v}
          </span>
        ))}
        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
          FY{contract.fiscalYear}
        </span>
        {contract.aln && (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
            ALN: {contract.aln}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-cobalt text-cobalt"
                  : "border-transparent text-charcoal-muted hover:text-charcoal"
              }`}
            >
              {tab.label}
              {tab.key === "fsg" && contract.fsgReports.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-cobalt text-white rounded-full">
                  {contract.fsgReports.length}
                </span>
              )}
              {tab.key === "budget" && contract.budgetUploads.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-cobalt text-white rounded-full">
                  {contract.budgetUploads.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "info" && <GrantInfoTab contract={contract} />}
      {activeTab === "budget" && (
        <GrantBudgetTab contract={contract} canEdit={contract.canEdit} />
      )}
      {activeTab === "fsg" && (
        <GrantFsgTab contract={contract} canEdit={contract.canEdit} />
      )}

      {/* Assign editor panel */}
      {showAssign && (
        <AssignEditorPanel
          contractId={contract.id}
          currentAssignments={contract.assignments}
          allUsers={allUsers}
          onClose={() => setShowAssign(false)}
          currentUserId={currentUserId}
        />
      )}
    </div>
  )
}
