"use client"

import { ContractDetail, CashEntry } from "@/types"

// ─── Types ───────────────────────────────────────────────────

type FsgLine = {
  accountCode: string
  objectCode: string
  description: string
  currentPeriod: number
  inceptionToDate: number
}

type FsgData = {
  reportDate?: string
  lines: FsgLine[]
  totalCurrentPeriod?: number
  totalInceptionToDate?: number
}

const OBJECT_CODE_LABELS: Record<string, string> = {
  "100": "Salaries",
  "200": "Benefits",
  "300": "Purchased Services",
  "400": "Supplies",
  "500": "Capital Outlay",
  "600": "Other",
}

// ─── Helpers ─────────────────────────────────────────────────

function fmt(v: string | null | undefined): number {
  if (!v) return 0
  return parseFloat(v) || 0
}

function usd(n: number) {
  if (n === 0) return null
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function usdAlways(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function getRawLines(raw: unknown): unknown[] {
  if (!raw || typeof raw !== "object") return []
  const maybeLines = (raw as { lines?: unknown[] }).lines
  return Array.isArray(maybeLines) ? maybeLines : []
}

function parseFsgData(raw: unknown): FsgLine[] {
  if (!raw || typeof raw !== "object") return []
  const data = raw as FsgData
  if (!Array.isArray(data.lines)) return []
  return data.lines.filter(
    (l) => typeof l.accountCode === "string" && typeof l.objectCode === "string"
  )
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—"
  if (value instanceof Date) {
    return value.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }
  const iso = value
  // Handle plain date strings without timezone conversion
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

// ─── Main component ───────────────────────────────────────────

export default function GrantIsbeReportTab({
  contract,
  cashEntries,
}: {
  contract: ContractDetail
  cashEntries: CashEntry[]
}) {
  // Resolve FSG data — prefer current period, fall back to next
  const currentFsg = contract.fsgReports.find((r) => r.period === "current")
  const nextFsg = contract.fsgReports.find((r) => r.period === "next")
  const activeFsg = currentFsg ?? nextFsg
  const fsgLines = parseFsgData(activeFsg?.parsedData)
  const rawFsgLines = getRawLines(activeFsg?.parsedData)
  const hasLegacyFsgData = rawFsgLines.length > 0 && fsgLines.length === 0

  // Derive unique accountCodes + objectCodes from data (sorted numerically)
  const accountCodes = [...new Set(fsgLines.map((l) => l.accountCode))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )
  const objectCodes = [...new Set(fsgLines.map((l) => l.objectCode))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )

  // Build lookup: accountCode+objectCode → line
  const lookup = new Map<string, FsgLine>()
  for (const line of fsgLines) {
    lookup.set(`${line.accountCode}|${line.objectCode}`, line)
  }

  // Stat card values
  const totalITD = fsgLines.reduce((s, l) => s + l.inceptionToDate, 0)
  const voucheredToDate = cashEntries.reduce((s, e) => s + fmt(e.cashReceipts), 0)
  const outstandingObligations = totalITD - Math.abs(voucheredToDate)
  const arBalance = cashEntries.reduce(
    (s, e) => s + fmt(e.claimedAmount) + fmt(e.cashReceipts),
    0
  )

  const hasData = fsgLines.length > 0

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Expenditures (ITD)"
          value={usdAlways(totalITD)}
          accent="cobalt"
        />
        <StatCard
          label="Vouchered to Date"
          value={usdAlways(Math.abs(voucheredToDate))}
          accent="green"
        />
        <StatCard
          label="Outstanding Obligations"
          value={usdAlways(outstandingObligations)}
          accent={outstandingObligations > 0 ? "cobalt" : "muted"}
        />
        <StatCard
          label="A/R Balance"
          value={usdAlways(arBalance)}
          accent={arBalance > 0 ? "cobalt" : arBalance < 0 ? "amber" : "muted"}
        />
      </div>

      {/* Report metadata */}
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

      {/* Expenditure table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wide">
            Expenditures by Function × Object (Inception to Date)
          </p>
        </div>

        {!hasData ? (
          <div className="py-16 text-center">
            <p className="text-charcoal-muted text-sm">No FSG data available.</p>
            <p className="text-xs text-gray-400 mt-1">
              {hasLegacyFsgData
                ? "This FSG was uploaded before account codes were extracted. Re-upload it to populate this view."
                : "Upload a current or next period FSG report to populate this view."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-border text-xs font-medium text-charcoal-muted uppercase tracking-wide">
                  <th className="px-4 py-3 text-left sticky left-0 bg-gray-50 z-10 border-r border-border min-w-[180px]">
                    Function / Program
                  </th>
                  {objectCodes.map((obj) => (
                    <th key={obj} className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="block font-bold text-charcoal">{obj}</span>
                      <span className="block font-normal normal-case text-charcoal-muted">
                        {OBJECT_CODE_LABELS[obj] ?? ""}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-bold text-charcoal">Total</th>
                </tr>
              </thead>
              <tbody>
                {accountCodes.map((acct, i) => {
                  const rowTotal = objectCodes.reduce((s, obj) => {
                    const line = lookup.get(`${acct}|${obj}`)
                    return s + (line?.inceptionToDate ?? 0)
                  }, 0)
                  const isZeroRow = rowTotal === 0

                  return (
                    <tr
                      key={acct}
                      className={`border-b border-border hover:bg-gray-50/60 transition-colors ${
                        isZeroRow ? "opacity-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                      }`}
                    >
                      <td className="px-4 py-3 sticky left-0 bg-inherit border-r border-border z-10">
                        <span className="font-semibold text-charcoal">{acct}</span>
                      </td>
                      {objectCodes.map((obj) => {
                        const line = lookup.get(`${acct}|${obj}`)
                        const v = line?.inceptionToDate ?? 0
                        return (
                          <td
                            key={obj}
                            className={`px-4 py-3 text-right tabular-nums ${
                              v === 0 ? "text-gray-300" : "text-charcoal"
                            }`}
                          >
                            {v === 0 ? "—" : usdAlways(v)}
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 text-right font-semibold text-charcoal tabular-nums">
                        {isZeroRow ? (
                          <span className="text-gray-300">—</span>
                        ) : (
                          usdAlways(rowTotal)
                        )}
                      </td>
                    </tr>
                  )
                })}
                {/* Totals row */}
                <tr className="bg-cobalt/10 font-bold border-t-2 border-cobalt/30">
                  <td className="px-4 py-3 sticky left-0 bg-cobalt/10 border-r border-border z-10">
                    Total
                  </td>
                  {objectCodes.map((obj) => {
                    const colTotal = accountCodes.reduce((s, acct) => {
                      const line = lookup.get(`${acct}|${obj}`)
                      return s + (line?.inceptionToDate ?? 0)
                    }, 0)
                    return (
                      <td key={obj} className="px-4 py-3 text-right text-charcoal tabular-nums">
                        {colTotal === 0 ? (
                          <span className="font-normal text-gray-300">—</span>
                        ) : (
                          usdAlways(colTotal)
                        )}
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 text-right text-cobalt tabular-nums">
                    {usdAlways(totalITD)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cash summary section */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wide">
            Cash Summary
          </p>
        </div>
        <div className="divide-y divide-border">
          {[
            ["Vouchered to Date", Math.abs(voucheredToDate), "green"],
            ["Cumulative Expenditures", totalITD, "cobalt"],
            ["Outstanding Obligations", outstandingObligations, outstandingObligations > 0 ? "cobalt" : "muted"],
            ["A/R Balance", arBalance, arBalance > 0 ? "cobalt" : arBalance < 0 ? "amber" : "muted"],
          ].map(([label, value, accent]) => (
            <div key={label as string} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-charcoal">{label as string}</span>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  accent === "cobalt"
                    ? "text-cobalt"
                    : accent === "green"
                    ? "text-emerald-600"
                    : accent === "amber"
                    ? "text-amber-600"
                    : "text-charcoal-muted"
                }`}
              >
                {usd(value as number) ?? <span className="text-gray-300 font-normal">—</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
