"use client"

import { useState } from "react"
import { ContractDetail, CashEntry } from "@/types"

// ─── Types ───────────────────────────────────────────────────

type FsgLine = {
  accountCode: string
  objectCode: string
  description: string           // object/expenditure description (e.g. "Salaries")
  functionDescription?: string  // function/program description (e.g. "Instruction")
  currentPeriod: number
  inceptionToDate: number
}

type FsgData = {
  reportDate?: string
  lines: FsgLine[]
}

// ─── Helpers ─────────────────────────────────────────────────

function fmt(v: string | null | undefined): number {
  if (!v) return 0
  return parseFloat(v) || 0
}

function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function parseFsgData(raw: unknown): FsgLine[] {
  if (!raw || typeof raw !== "object") return []
  const data = raw as FsgData
  if (!Array.isArray(data.lines)) return []
  return data.lines.filter(
    (l) => typeof l.accountCode === "string" && typeof l.objectCode === "string"
  )
}

function hasLegacyShape(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false
  const lines = (raw as { lines?: unknown[] }).lines
  if (!Array.isArray(lines) || lines.length === 0) return false
  return !("accountCode" in (lines[0] as object))
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—"
  if (value instanceof Date) {
    return value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-")
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    })
  }
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ─── Stat Card ───────────────────────────────────────────────

function StatCard({ label, value, accent }: {
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
      <p className="text-xs font-medium text-charcoal-muted uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[accent ?? "cobalt"]}`}>{value}</p>
    </div>
  )
}

// ─── Editable amount field ────────────────────────────────────

function EditableAmount({
  value,
  onChange,
  placeholder = "0.00",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative inline-flex items-center">
      <span className="absolute left-2.5 text-charcoal-muted text-sm select-none">$</span>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-6 pr-3 py-1.5 text-sm text-right w-40 border border-cobalt/30 rounded-md bg-cobalt-light/30 focus:outline-none focus:ring-2 focus:ring-cobalt/30 focus:border-cobalt tabular-nums"
      />
    </div>
  )
}

// ─── Summary row ─────────────────────────────────────────────

function SummaryRow({
  label,
  sub,
  value,
  valueClass = "text-charcoal",
  children,
  muted,
}: {
  label: string
  sub?: string
  value?: string | null
  valueClass?: string
  children?: React.ReactNode
  muted?: boolean
}) {
  return (
    <div className={`flex items-center justify-between px-5 py-3 gap-4 ${muted ? "opacity-50" : ""}`}>
      <div className="min-w-0">
        <span className={`text-sm ${muted ? "italic text-charcoal-muted" : "text-charcoal"}`}>{label}</span>
        {sub && <span className="text-xs text-charcoal-muted ml-1.5">{sub}</span>}
      </div>
      {children ?? (
        <span className={`text-sm font-semibold tabular-nums shrink-0 ${valueClass}`}>
          {value ?? <span className="text-gray-300 font-normal">—</span>}
        </span>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────

export default function GrantIsbeReportTab({
  contract,
  cashEntries,
  footnotes,
}: {
  contract: ContractDetail
  cashEntries: CashEntry[]
  footnotes: { style: "number" | "letter" | "bullet"; items: string[] }
}) {
  // ── FSG data ─────────────────────────────────────────────
  const activeFsg = contract.fsgReports.find((r) => r.period === "current")
    ?? contract.fsgReports.find((r) => r.period === "next")

  const fsgLines = parseFsgData(activeFsg?.parsedData)
  const isLegacy = hasLegacyShape(activeFsg?.parsedData)

  // Derive unique account + object codes from FSG data only (no hardcoding)
  const accountCodes = [...new Set(fsgLines.map((l) => l.accountCode))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )
  const objectCodes = [...new Set(fsgLines.map((l) => l.objectCode))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )

  // Build description lookups and ITD lookup from FSG data
  const acctDescriptions = new Map<string, string>() // accountCode → function description
  const objDescriptions = new Map<string, string>()  // objectCode → object description
  const lookup = new Map<string, number>()           // accountCode|objectCode → ITD

  for (const line of fsgLines) {
    // Function description comes from functionDescription field (set by updated FSG parser)
    if (!acctDescriptions.has(line.accountCode) && line.functionDescription) {
      acctDescriptions.set(line.accountCode, line.functionDescription)
    }
    // Object description comes from the description field (e.g. "Salaries", "Benefits")
    if (!objDescriptions.has(line.objectCode) && line.description) {
      objDescriptions.set(line.objectCode, line.description)
    }
    const key = `${line.accountCode}|${line.objectCode}`
    lookup.set(key, (lookup.get(key) ?? 0) + line.inceptionToDate)
  }

  // ── Expenditure calculations ──────────────────────────────
  const totalITD = fsgLines.reduce((s, l) => s + l.inceptionToDate, 0)

  // Per-account totals (only non-zero rows shown)
  const nonZeroAccounts = accountCodes.filter((acct) =>
    objectCodes.some((obj) => (lookup.get(`${acct}|${obj}`) ?? 0) !== 0)
  )

  // ── Cash summary state (manual inputs) ───────────────────
  const [vouchered, setVouchered] = useState(
    contract.isbeVoucheredToDate ? fmt(contract.isbeVoucheredToDate).toString() : ""
  )
  const [outstanding, setOutstanding] = useState(
    contract.isbeOutstandingObligs ? fmt(contract.isbeOutstandingObligs).toString() : ""
  )
  const [carryover, setCarryover] = useState(
    contract.isbeCarryover ? fmt(contract.isbeCarryover).toString() : ""
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function saveCashFields() {
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      const res = await fetch(`/api/grants-isbe/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isbeVoucheredToDate: vouchered === "" ? null : parseFloat(vouchered),
          isbeOutstandingObligs: outstanding === "" ? null : parseFloat(outstanding),
          isbeCarryover: carryover === "" ? null : parseFloat(carryover),
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  // ── Calculated cash summary values ────────────────────────
  const voucheredNum = parseFloat(vouchered) || 0
  const outstandingNum = parseFloat(outstanding) || 0
  const carryoverNum = parseFloat(carryover) || 0
  const commitmentAmount = fmt(contract.commitmentAmount)

  // L33: Cumulative Expenditures = Total Expenditures (ITD)
  const cumulativeExpenditures = totalITD
  // L35: Total Expend + Obligations
  const totalExpendPlusObligs = cumulativeExpenditures + outstandingNum
  // L38: Balance = Vouchered - Cumulative
  const balance = voucheredNum - cumulativeExpenditures
  // L39: Adjusted Commitment = Carryover + Current Year
  const adjustedCommitment = carryoverNum + commitmentAmount

  const hasData = fsgLines.length > 0

  // ── CSV download ──────────────────────────────────────────
  function downloadCsv() {
    const escape = (v: string | number | null | undefined) => {
      const s = v == null ? "" : String(v)
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }
    const row = (...cols: (string | number | null | undefined)[]) =>
      cols.map(escape).join(",")

    const rows: string[] = []

    // Header metadata
    rows.push(row("ISBE Expenditure Report"))
    rows.push(row("Contract No", contract.contractNo))
    rows.push(row("Grant Code", contract.grantValues?.join(", ") ?? ""))
    rows.push(row("Cumulative Through", activeFsg?.parsedData
      ? formatDate((activeFsg.parsedData as FsgData).reportDate)
      : ""))
    rows.push(row("Generated", new Date().toLocaleDateString("en-US")))
    rows.push("")

    // Expenditure table header
    const objHeaders = objectCodes.map(
      (obj) => `${obj} ${objDescriptions.get(obj) ?? ""}`.trim()
    )
    rows.push(row("Function Code", "Function Description", ...objHeaders, "Total"))

    // Data rows
    for (const acct of nonZeroAccounts) {
      const rowTotal = objectCodes.reduce((s, obj) => s + (lookup.get(`${acct}|${obj}`) ?? 0), 0)
      const cells = objectCodes.map((obj) => lookup.get(`${acct}|${obj}`) ?? 0)
      rows.push(row(acct, acctDescriptions.get(acct) ?? "", ...cells, rowTotal))
    }

    // Totals rows
    const colTotals = objectCodes.map((obj) =>
      accountCodes.reduce((s, acct) => s + (lookup.get(`${acct}|${obj}`) ?? 0), 0)
    )
    rows.push(row("Total Direct Costs", "", ...colTotals, totalITD))
    rows.push(row("Approved Indirect Costs", "", ...objectCodes.map(() => ""), ""))
    rows.push(row("Total Expenditures", "", ...colTotals, totalITD))
    rows.push("")

    // Cash summary
    rows.push(row("Cash Summary"))
    rows.push(row("Vouchered to Date (L32)", voucheredNum))
    rows.push(row("Cumulative Expenditures (L33)", cumulativeExpenditures))
    rows.push(row("Outstanding Obligations (L34)", outstandingNum))
    rows.push(row("Total Expenditures + Obligations (L35)", totalExpendPlusObligs))
    rows.push(row("Carryover", carryoverNum))
    rows.push(row("Current Year", commitmentAmount))
    rows.push(row("Commitment Amount Total", adjustedCommitment))
    rows.push(row("Balance (L38)", balance))
    rows.push(row("Adjusted Commitment Amount (L39)", adjustedCommitment))

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ISBE_Report_${contract.contractNo}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">

      {/* ── Stat cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Expenditures (ITD)" value={usd(totalITD)} accent="cobalt" />
        <StatCard label="Vouchered to Date" value={usd(voucheredNum)} accent="green" />
        <StatCard
          label="Outstanding Obligations"
          value={usd(outstandingNum)}
          accent={outstandingNum > 0 ? "cobalt" : "muted"}
        />
        <StatCard
          label="Balance"
          value={usd(balance)}
          accent={balance < 0 ? "amber" : balance > 0 ? "cobalt" : "muted"}
        />
      </div>

      {/* ── Report metadata ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-border shadow-sm px-5 py-4">
        <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wide mb-3">
          Report Information
        </p>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4 text-sm">
          {[
            ["Contract No", contract.contractNo],
            ["Grant Code", contract.grantValues?.join(", ") || "—"],
            ["Submission Date", formatDate(new Date())],
            [
              "Cumulative Through",
              activeFsg?.parsedData
                ? formatDate((activeFsg.parsedData as FsgData).reportDate)
                : "—",
            ],
            ["Contact Person", contract.isbeContactPerson],
            ["Phone", contract.isbePhone],
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

      {/* ── Expenditure table ────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wide">
            Expenditures by Function × Object (Inception to Date)
          </p>
          {hasData && (
            <button
              onClick={downloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cobalt border border-cobalt/30 rounded-md hover:bg-cobalt-light transition-colors"
            >
              ↓ Download CSV
            </button>
          )}
        </div>

        {!hasData ? (
          <div className="py-16 text-center">
            <p className="text-charcoal-muted text-sm">No FSG data available.</p>
            <p className="text-xs text-gray-400 mt-1">
              {isLegacy
                ? "This FSG was uploaded before account codes were extracted. Re-upload it to populate this view."
                : "Upload a current or next period FSG report to populate this view."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-border text-xs text-charcoal-muted">
                  <th className="px-4 py-3 text-left sticky left-0 bg-gray-50 z-10 border-r border-border min-w-[200px] font-semibold uppercase tracking-wide">
                    Function
                  </th>
                  {objectCodes.map((obj) => (
                    <th key={obj} className="px-3 py-3 text-right min-w-[100px]">
                      <span className="block font-bold text-charcoal">{obj}</span>
                      <span className="block font-normal normal-case text-charcoal-muted leading-tight">
                        {objDescriptions.get(obj) ?? ""}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-bold text-charcoal min-w-[110px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {nonZeroAccounts.map((acct, i) => {
                  const rowTotal = objectCodes.reduce(
                    (s, obj) => s + (lookup.get(`${acct}|${obj}`) ?? 0), 0
                  )
                  return (
                    <tr
                      key={acct}
                      className={`border-b border-border hover:bg-gray-50/60 transition-colors ${
                        i % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                      }`}
                    >
                      <td className="px-4 py-2.5 sticky left-0 bg-inherit border-r border-border z-10">
                        <span className="font-semibold text-charcoal block">{acct}</span>
                        {acctDescriptions.get(acct) && (
                          <span className="text-xs text-charcoal-muted leading-tight">
                            {acctDescriptions.get(acct)}
                          </span>
                        )}
                      </td>
                      {objectCodes.map((obj) => {
                        const v = lookup.get(`${acct}|${obj}`) ?? 0
                        return (
                          <td key={obj} className={`px-3 py-2.5 text-right tabular-nums ${v === 0 ? "text-gray-300" : "text-charcoal"}`}>
                            {v === 0 ? "—" : usd(v)}
                          </td>
                        )
                      })}
                      <td className="px-4 py-2.5 text-right font-semibold text-charcoal tabular-nums">
                        {usd(rowTotal)}
                      </td>
                    </tr>
                  )
                })}

                {/* Total Direct Costs */}
                <tr className="bg-cobalt/5 border-t-2 border-cobalt/20 font-semibold">
                  <td className="px-4 py-3 sticky left-0 bg-cobalt/5 border-r border-border z-10 text-xs uppercase tracking-wide text-charcoal">
                    Total Direct Costs
                  </td>
                  {objectCodes.map((obj) => {
                    const col = accountCodes.reduce((s, acct) => s + (lookup.get(`${acct}|${obj}`) ?? 0), 0)
                    return (
                      <td key={obj} className="px-3 py-3 text-right tabular-nums text-charcoal">
                        {col === 0 ? <span className="font-normal text-gray-300">—</span> : usd(col)}
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 text-right text-cobalt tabular-nums">{usd(totalITD)}</td>
                </tr>

                {/* Approved Indirect Costs */}
                <tr className="border-b border-border text-charcoal-muted">
                  <td className="px-4 py-2.5 sticky left-0 bg-white border-r border-border z-10 text-xs italic">
                    Approved Indirect Costs
                  </td>
                  {objectCodes.map((obj) => (
                    <td key={obj} className="px-3 py-2.5 text-right text-gray-300">—</td>
                  ))}
                  <td className="px-4 py-2.5 text-right text-gray-300">—</td>
                </tr>

                {/* Total Expenditures */}
                <tr className="bg-cobalt/10 font-bold border-t border-cobalt/30">
                  <td className="px-4 py-3 sticky left-0 bg-cobalt/10 border-r border-border z-10 text-xs uppercase tracking-wide text-charcoal">
                    Total Expenditures
                  </td>
                  {objectCodes.map((obj) => {
                    const col = accountCodes.reduce((s, acct) => s + (lookup.get(`${acct}|${obj}`) ?? 0), 0)
                    return (
                      <td key={obj} className="px-3 py-3 text-right tabular-nums text-charcoal">
                        {col === 0 ? <span className="font-normal text-gray-300">—</span> : usd(col)}
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 text-right text-cobalt tabular-nums">{usd(totalITD)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Cash Summary (manual inputs + calculations) ──────── */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wide">
            Cash Summary
          </p>
          <p className="text-xs text-charcoal-muted">
            Fields marked with a pencil are manual entries
          </p>
        </div>

        <div className="divide-y divide-border">
          {/* L32 — Vouchered to Date (manual) */}
          <div className="flex items-center justify-between px-5 py-3.5 gap-4 bg-cobalt-light/20">
            <div>
              <span className="text-sm text-charcoal">Vouchered to Date</span>
              <span className="text-xs text-charcoal-muted ml-2">
                Includes pre-payments &amp; negative adjustments ***
              </span>
              <span className="ml-2 text-xs text-cobalt font-medium">✎ manual</span>
            </div>
            {contract.canEdit ? (
              <EditableAmount value={vouchered} onChange={(v) => { setVouchered(v); setSaved(false) }} />
            ) : (
              <span className="text-sm font-semibold tabular-nums text-emerald-600">
                {voucheredNum > 0 ? usd(voucheredNum) : <span className="text-gray-300 font-normal">—</span>}
              </span>
            )}
          </div>

          {/* L33 — Cumulative Expenditures (calculated) */}
          <SummaryRow
            label="Cumulative Expenditures (Year-to-Date)"
            sub="= Total Expenditures above"
            value={usd(cumulativeExpenditures)}
            valueClass="text-cobalt"
          />

          {/* L34 — Outstanding Obligations (manual) */}
          <div className="flex items-center justify-between px-5 py-3.5 gap-4 bg-cobalt-light/20">
            <div>
              <span className="text-sm text-charcoal">Outstanding Obligations</span>
              <span className="ml-2 text-xs text-cobalt font-medium">✎ manual</span>
            </div>
            {contract.canEdit ? (
              <EditableAmount value={outstanding} onChange={(v) => { setOutstanding(v); setSaved(false) }} />
            ) : (
              <span className="text-sm font-semibold tabular-nums text-charcoal">
                {outstandingNum > 0 ? usd(outstandingNum) : <span className="text-gray-300 font-normal">—</span>}
              </span>
            )}
          </div>

          {/* L35 — Total Expend + Obligations */}
          <SummaryRow
            label="Total Expenditures + Obligations"
            sub="= L33 + L34"
            value={usd(totalExpendPlusObligs)}
            valueClass="text-cobalt"
          />

          {/* L36 — Commitment Amount (breakdown) */}
          <div className="px-5 py-3.5 space-y-2">
            <p className="text-sm text-charcoal font-medium">Commitment Amount</p>
            <div className="ml-4 space-y-1.5 text-sm">
              {/* Carryover — manual */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-charcoal-muted">Carryover</span>
                  <span className="ml-2 text-xs text-cobalt font-medium">✎ manual</span>
                </div>
                {contract.canEdit ? (
                  <EditableAmount value={carryover} onChange={(v) => { setCarryover(v); setSaved(false) }} />
                ) : (
                  <span className="tabular-nums text-charcoal">
                    {carryoverNum > 0 ? usd(carryoverNum) : <span className="text-gray-300">—</span>}
                  </span>
                )}
              </div>
              {/* Current Year — from contract info */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-charcoal-muted">Current Year</span>
                <span className="tabular-nums text-charcoal font-medium">
                  {commitmentAmount > 0 ? usd(commitmentAmount) : <span className="text-gray-300">—</span>}
                </span>
              </div>
              {/* Total */}
              <div className="flex items-center justify-between gap-4 border-t border-border pt-1.5 font-semibold">
                <span className="text-charcoal">Total</span>
                <span className="tabular-nums text-cobalt">
                  {adjustedCommitment > 0 ? usd(adjustedCommitment) : <span className="text-gray-300 font-normal">—</span>}
                </span>
              </div>
            </div>
          </div>

          {/* L37 — Future Use */}
          <SummaryRow label="(Future Use)" muted />

          {/* L38 — Balance */}
          <SummaryRow
            label="Balance"
            sub="= Vouchered − Cumulative Expenditures"
            value={usd(balance)}
            valueClass={balance < 0 ? "text-amber-600" : balance > 0 ? "text-cobalt" : "text-charcoal-muted"}
          />

          {/* L39 — Adjusted Commitment Amount */}
          <SummaryRow
            label="Adjusted Commitment Amount"
            sub="= Carryover + Current Year"
            value={adjustedCommitment > 0 ? usd(adjustedCommitment) : null}
            valueClass="text-cobalt"
          />
        </div>

        {/* Save button */}
        {contract.canEdit && (
          <div className="px-5 py-4 border-t border-border bg-gray-50 flex items-center gap-3">
            <button
              onClick={saveCashFields}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-cobalt text-white rounded-md hover:bg-cobalt-dark disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save Cash Summary"}
            </button>
            {saved && <span className="text-sm text-green-600">✓ Saved</span>}
            {saveError && <span className="text-sm text-red-600">{saveError}</span>}
          </div>
        )}
      </div>

      {/* ── Footnotes (from DB) ──────────────────────────────── */}
      {footnotes.items.length > 0 && (
        <div className="bg-gray-50 rounded-xl border border-border px-5 py-4 space-y-2">
          <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-3">Notes</p>
          {footnotes.items.map((note, i) => (
            <p key={i} className="text-xs text-charcoal-muted">
              <span className="font-semibold mr-1.5">
                {footnotes.style === "letter"
                  ? `${String.fromCharCode(65 + i)}.`
                  : footnotes.style === "bullet"
                  ? "•"
                  : `${i + 1}.`}
              </span>
              {note}
            </p>
          ))}
        </div>
      )}

    </div>
  )
}
