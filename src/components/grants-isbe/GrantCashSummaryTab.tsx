"use client"

import { useState } from "react"
import { ContractDetail, CashEntry } from "@/types"

// ─── Helpers ─────────────────────────────────────────────────

function fmt(v: string | null | undefined): number {
  if (!v) return 0
  return parseFloat(v) || 0
}

function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—"
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-")
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// ─── Stat Card ───────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: "cobalt" | "green" | "amber" | "muted"
}) {
  const colors = {
    cobalt: "text-cobalt",
    green: "text-emerald-600",
    amber: "text-amber-600",
    muted: "text-charcoal-muted",
  }
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-5 py-4">
      <p className="text-xs font-medium text-charcoal-muted uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${colors[accent ?? "cobalt"]}`}>{value}</p>
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────

type EntryFormData = {
  fiscalYear: string
  invoiceNo: string
  claimPeriod: string
  accountingPeriodDate: string
  claimedAmount: string
  cashReceipts: string
  advanceOffset: string
  comments: string
}

const EMPTY_FORM: EntryFormData = {
  fiscalYear: "",
  invoiceNo: "",
  claimPeriod: "",
  accountingPeriodDate: "",
  claimedAmount: "",
  cashReceipts: "",
  advanceOffset: "",
  comments: "",
}

function EntryModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial: EntryFormData
  onSave: (data: EntryFormData) => void
  onClose: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<EntryFormData>(initial)

  function set(k: keyof EntryFormData, v: string) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-charcoal">
            {initial.fiscalYear ? "Edit Entry" : "Add Entry"}
          </h2>
          <button
            onClick={onClose}
            className="text-charcoal-muted hover:text-charcoal text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <label className="col-span-1 flex flex-col gap-1">
            <span className="text-xs font-medium text-charcoal-muted uppercase tracking-wide">
              Fiscal Year *
            </span>
            <input
              type="number"
              placeholder="2026"
              value={form.fiscalYear}
              onChange={(e) => set("fiscalYear", e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt/30"
            />
          </label>
          <label className="col-span-1 flex flex-col gap-1">
            <span className="text-xs font-medium text-charcoal-muted uppercase tracking-wide">
              Invoice / Receipt #
            </span>
            <input
              type="text"
              placeholder="INV-001"
              value={form.invoiceNo}
              onChange={(e) => set("invoiceNo", e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt/30"
            />
          </label>
          <label className="col-span-1 flex flex-col gap-1">
            <span className="text-xs font-medium text-charcoal-muted uppercase tracking-wide">
              Claim Period
            </span>
            <input
              type="text"
              placeholder="7/1/24–9/30/24"
              value={form.claimPeriod}
              onChange={(e) => set("claimPeriod", e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt/30"
            />
          </label>
          <label className="col-span-1 flex flex-col gap-1">
            <span className="text-xs font-medium text-charcoal-muted uppercase tracking-wide">
              Acctg Period Date
            </span>
            <input
              type="date"
              value={form.accountingPeriodDate}
              onChange={(e) => set("accountingPeriodDate", e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt/30"
            />
          </label>
          <label className="col-span-1 flex flex-col gap-1">
            <span className="text-xs font-medium text-charcoal-muted uppercase tracking-wide">
              Claimed Amount
            </span>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.claimedAmount}
              onChange={(e) => set("claimedAmount", e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt/30"
            />
          </label>
          <label className="col-span-1 flex flex-col gap-1">
            <span className="text-xs font-medium text-charcoal-muted uppercase tracking-wide">
              Cash Receipts
            </span>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.cashReceipts}
              onChange={(e) => set("cashReceipts", e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt/30"
            />
          </label>
          <label className="col-span-1 flex flex-col gap-1">
            <span className="text-xs font-medium text-charcoal-muted uppercase tracking-wide">
              Advance / Offset
            </span>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.advanceOffset}
              onChange={(e) => set("advanceOffset", e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt/30"
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-xs font-medium text-charcoal-muted uppercase tracking-wide">
              Comments
            </span>
            <textarea
              rows={2}
              placeholder="Optional notes…"
              value={form.comments}
              onChange={(e) => set("comments", e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt/30 resize-none"
            />
          </label>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="text-sm text-charcoal-muted hover:text-charcoal px-4 py-2 rounded-lg border border-border"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.fiscalYear}
            className="text-sm bg-cobalt text-white px-5 py-2 rounded-lg hover:bg-cobalt-dark disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Entry"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────

export default function GrantCashSummaryTab({
  contract,
  initialEntries,
  canEdit,
}: {
  contract: ContractDetail
  initialEntries: CashEntry[]
  canEdit: boolean
}) {
  const [entries, setEntries] = useState<CashEntry[]>(initialEntries)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CashEntry | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // ─── Computed totals ───────────────────────────────────────

  const sortedEntries = [...entries].sort((a, b) => {
    const aDate = a.accountingPeriodDate ?? a.createdAt
    const bDate = b.accountingPeriodDate ?? b.createdAt
    const dateCompare = new Date(aDate).getTime() - new Date(bDate).getTime()
    if (dateCompare !== 0) return dateCompare
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  const totalClaimed = sortedEntries.reduce((s, e) => s + fmt(e.claimedAmount), 0)
  const totalReceipts = sortedEntries.reduce((s, e) => s + fmt(e.cashReceipts), 0)
  const totalAR = totalClaimed + totalReceipts
  const budgetAmount = fmt(contract.commitmentAmount)

  // ─── Running A/R per row ───────────────────────────────────

  let runningAR = 0
  const rowsWithAR = sortedEntries.map((e) => {
    runningAR += fmt(e.claimedAmount) + fmt(e.cashReceipts)
    return { entry: e, ar: runningAR }
  })

  // ─── FY groups ────────────────────────────────────────────

  const fySet = [...new Set(sortedEntries.map((e) => e.fiscalYear))].sort()

  // ─── API helpers ──────────────────────────────────────────

  async function saveEntry(form: EntryFormData) {
    setSaving(true)
    try {
      const body = {
        fiscalYear: form.fiscalYear,
        invoiceNo: form.invoiceNo || null,
        claimPeriod: form.claimPeriod || null,
        accountingPeriodDate: form.accountingPeriodDate || null,
        claimedAmount: form.claimedAmount !== "" ? form.claimedAmount : null,
        cashReceipts: form.cashReceipts !== "" ? form.cashReceipts : null,
        advanceOffset: form.advanceOffset !== "" ? form.advanceOffset : null,
        comments: form.comments || null,
      }

      if (editTarget) {
        const res = await fetch(
          `/api/grants-isbe/${contract.id}/cash/${editTarget.id}`,
          { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        )
        if (!res.ok) throw new Error("Failed to update")
        const updated: CashEntry = await res.json()
        setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      } else {
        const res = await fetch(`/api/grants-isbe/${contract.id}/cash`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error("Failed to create")
        const created: CashEntry = await res.json()
        setEntries((prev) => [...prev, created])
      }
      setModalOpen(false)
      setEditTarget(null)
    } catch {
      alert("Failed to save entry. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  async function deleteEntry(id: string) {
    const res = await fetch(`/api/grants-isbe/${contract.id}/cash/${id}`, { method: "DELETE" })
    if (!res.ok) {
      alert("Failed to delete entry. Please try again.")
      return
    }
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setDeleteConfirm(null)
  }

  function openAdd() {
    setEditTarget(null)
    setModalOpen(true)
  }

  function openEdit(e: CashEntry) {
    setEditTarget(e)
    setModalOpen(true)
  }

  const modalInitial: EntryFormData = editTarget
    ? {
        fiscalYear: String(editTarget.fiscalYear),
        invoiceNo: editTarget.invoiceNo ?? "",
        claimPeriod: editTarget.claimPeriod ?? "",
        accountingPeriodDate: editTarget.accountingPeriodDate
          ? editTarget.accountingPeriodDate.slice(0, 10)
          : "",
        claimedAmount: editTarget.claimedAmount ?? "",
        cashReceipts: editTarget.cashReceipts ?? "",
        advanceOffset: editTarget.advanceOffset ?? "",
        comments: editTarget.comments ?? "",
      }
    : EMPTY_FORM

  // ─── A/R balance color ────────────────────────────────────

  function arColor(ar: number) {
    if (ar > 0) return "text-cobalt font-medium"
    if (ar < 0) return "text-amber-600 font-medium"
    return "text-charcoal-muted"
  }

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Budget Amount" value={budgetAmount ? usd(budgetAmount) : "—"} accent="muted" />
        <StatCard label="Total Claimed" value={usd(totalClaimed)} accent="cobalt" />
        <StatCard label="Total Received" value={usd(Math.abs(totalReceipts))} accent="green" />
        <StatCard
          label="Current A/R Balance"
          value={usd(totalAR)}
          accent={totalAR > 0 ? "cobalt" : totalAR < 0 ? "amber" : "muted"}
        />
      </div>

      {/* Contract info strip */}
      <div className="bg-white rounded-xl border border-border shadow-sm px-5 py-4">
        <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wide mb-3">
          Contract Information
        </p>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4 text-sm">
          {[
            ["Contract No", contract.contractNo],
            ["Grant / Fund", contract.grantValues?.join(", ") || "—"],
            ["CPS Budget Person", contract.cpsBudgetPerson],
            ["ISBE Contact", contract.isbeContactPerson],
            ["Agency Location", contract.agencyLocation],
            ["Fund", contract.fund],
            ["Unit", contract.unit],
            ["Revenue Acct", contract.revenueAccount],
            ["ALN", contract.aln],
            ["Program Period", contract.programPeriod],
            ["Completion Report", formatDate(contract.completionReportDate)],
            ["Final Report", formatDate(contract.finalReportDate)],
          ].map(([label, val]) => (
            <div key={label}>
              <dt className="text-xs font-medium text-charcoal-muted uppercase tracking-wide mb-0.5">
                {label}
              </dt>
              <dd className="text-charcoal">{val || <span className="text-gray-400 italic">—</span>}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wide">
            Transactions
          </p>
          {canEdit && (
            <button
              onClick={openAdd}
              className="text-sm bg-cobalt text-white px-4 py-1.5 rounded-lg hover:bg-cobalt-dark"
            >
              + Add Entry
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-charcoal-muted text-sm">No entries yet.</p>
            {canEdit && (
              <p className="text-xs text-gray-400 mt-1">
                Use &quot;Add Entry&quot; to record ISBE invoice claims and cash receipts.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-border text-xs font-medium text-charcoal-muted uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Invoice / Receipt #</th>
                  <th className="px-4 py-3 text-left">Claim Period</th>
                  <th className="px-4 py-3 text-left">Acctg Period</th>
                  <th className="px-4 py-3 text-right">Claimed Amount</th>
                  <th className="px-4 py-3 text-right">Cash Receipts</th>
                  <th className="px-4 py-3 text-right">A/R Balance</th>
                  <th className="px-4 py-3 text-right">Advance/Offset</th>
                  <th className="px-4 py-3 text-left">Comments</th>
                  {canEdit && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {fySet.map((fy) => {
                  const fyRows = rowsWithAR.filter((r) => r.entry.fiscalYear === fy)
                  const fyClaimed = fyRows.reduce((s, r) => s + fmt(r.entry.claimedAmount), 0)
                  const fyReceipts = fyRows.reduce((s, r) => s + fmt(r.entry.cashReceipts), 0)
                  const fyAR = fyClaimed + fyReceipts

                  return (
                    <>
                      {fyRows.map(({ entry, ar }, i) => (
                        <tr
                          key={entry.id}
                          className={`border-b border-border hover:bg-gray-50/60 transition-colors ${
                            i % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                          }`}
                        >
                          <td className="px-4 py-3 text-charcoal">
                            {entry.invoiceNo || <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-charcoal">
                            {entry.claimPeriod || <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-charcoal">
                            {formatDate(entry.accountingPeriodDate)}
                          </td>
                          <td className="px-4 py-3 text-right text-charcoal">
                            {entry.claimedAmount ? usd(fmt(entry.claimedAmount)) : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-charcoal">
                            {entry.cashReceipts ? usd(fmt(entry.cashReceipts)) : <span className="text-gray-400">—</span>}
                          </td>
                          <td className={`px-4 py-3 text-right ${arColor(ar)}`}>
                            {usd(ar)}
                          </td>
                          <td className="px-4 py-3 text-right text-charcoal">
                            {entry.advanceOffset ? usd(fmt(entry.advanceOffset)) : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-charcoal max-w-xs truncate">
                            {entry.comments || <span className="text-gray-400">—</span>}
                          </td>
                          {canEdit && (
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 justify-end">
                                <button
                                  onClick={() => openEdit(entry)}
                                  className="text-charcoal-muted hover:text-cobalt"
                                  title="Edit"
                                >
                                  ✏️
                                </button>
                                {deleteConfirm === entry.id ? (
                                  <span className="flex gap-1">
                                    <button
                                      onClick={() => deleteEntry(entry.id)}
                                      className="text-xs text-red-600 font-medium"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirm(null)}
                                      className="text-xs text-charcoal-muted"
                                    >
                                      Cancel
                                    </button>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => setDeleteConfirm(entry.id)}
                                    className="text-charcoal-muted hover:text-red-500"
                                    title="Delete"
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                      {/* FY subtotal row */}
                      <tr className="bg-cobalt/5 border-b-2 border-cobalt/20 font-semibold text-sm">
                        <td colSpan={3} className="px-4 py-2 text-charcoal">
                          FY {fy} Total
                        </td>
                        <td className="px-4 py-2 text-right text-charcoal">{usd(fyClaimed)}</td>
                        <td className="px-4 py-2 text-right text-charcoal">{usd(fyReceipts)}</td>
                        <td className={`px-4 py-2 text-right ${arColor(fyAR)}`}>{usd(fyAR)}</td>
                        <td colSpan={canEdit ? 3 : 2} />
                      </tr>
                    </>
                  )
                })}
                {/* Grant total row */}
                <tr className="bg-cobalt/10 font-bold text-sm border-t-2 border-cobalt/30">
                  <td colSpan={3} className="px-4 py-3 text-charcoal">
                    Grant Total
                  </td>
                  <td className="px-4 py-3 text-right text-charcoal">{usd(totalClaimed)}</td>
                  <td className="px-4 py-3 text-right text-charcoal">{usd(totalReceipts)}</td>
                  <td className={`px-4 py-3 text-right ${arColor(totalAR)}`}>{usd(totalAR)}</td>
                  <td colSpan={canEdit ? 3 : 2} />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <EntryModal
          initial={modalInitial}
          onSave={saveEntry}
          onClose={() => {
            setModalOpen(false)
            setEditTarget(null)
          }}
          saving={saving}
        />
      )}
    </div>
  )
}
