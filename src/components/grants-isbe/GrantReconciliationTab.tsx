"use client"

import { ContractDetail } from "@/types"

// ─── Types ───────────────────────────────────────────────────

type FsgLine = {
  accountCode: string
  objectCode: string
  description: string
  currentPeriod: number
  inceptionToDate: number
}

type BudgetLine = {
  accountCode: string
  objectCode: string
  description: string
  amount: number
}

type FsgData = {
  reportDate?: string
  lines: FsgLine[]
}

type BudgetData = {
  lines: BudgetLine[]
  totalAmount: number
}

// ─── Helpers ─────────────────────────────────────────────────

function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function parseFsgLines(raw: unknown): FsgLine[] {
  if (!raw || typeof raw !== "object") return []
  const data = raw as FsgData
  if (!Array.isArray(data.lines)) return []
  return data.lines.filter(
    (l) => typeof l.accountCode === "string" && typeof l.objectCode === "string"
  )
}

function parseBudgetLines(raw: unknown): BudgetLine[] {
  if (Array.isArray(raw)) {
    return raw.filter(
      (line): line is BudgetLine =>
        !!line &&
        typeof line === "object" &&
        typeof (line as BudgetLine).accountCode === "string" &&
        typeof (line as BudgetLine).objectCode === "string" &&
        typeof (line as BudgetLine).amount === "number"
    )
  }

  if (!raw || typeof raw !== "object") return []
  const data = raw as BudgetData
  if (!Array.isArray(data.lines)) return []
  return data.lines.filter(
    (line): line is BudgetLine =>
      typeof line.accountCode === "string" &&
      typeof line.objectCode === "string" &&
      typeof line.amount === "number"
  )
}

function getFsgReportDate(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null
  return (raw as FsgData).reportDate ?? null
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return null
  if (value instanceof Date) {
    return value.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }
  const iso = value
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
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: React.ReactNode
  accent?: "cobalt" | "green" | "amber" | "red" | "muted"
}) {
  const colors = {
    cobalt: "text-cobalt",
    green: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
    muted: "text-charcoal-muted",
  }
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-5 py-4">
      <p className="text-xs font-medium text-charcoal-muted uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${colors[accent ?? "cobalt"]}`}>{value}</p>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  )
}

// ─── Overrun chip ─────────────────────────────────────────────

function OverrunChip({ budget, spent }: { budget: number | null; spent: number }) {
  if (budget === null) return <span className="text-gray-300">—</span>
  const variance = budget - spent
  if (variance >= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
        ↓ {usd(variance)}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
      ↑ {usd(Math.abs(variance))}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────

export default function GrantReconciliationTab({
  contract,
}: {
  contract: ContractDetail
}) {
  const currentFsg = contract.fsgReports.find((r) => r.period === "current")
  const nextFsg = contract.fsgReports.find((r) => r.period === "next")
  const budget = contract.budgetUploads[0]

  const budgetLines = parseBudgetLines(budget?.parsedData)
  const currentLines = parseFsgLines(currentFsg?.parsedData)
  const nextLines = parseFsgLines(nextFsg?.parsedData)
  const rawBudgetLines = Array.isArray((budget?.parsedData as { lines?: unknown[] } | null)?.lines)
    ? ((budget?.parsedData as { lines?: unknown[] }).lines ?? [])
    : Array.isArray(budget?.parsedData)
    ? (budget?.parsedData as unknown[])
    : []
  const rawCurrentLines = Array.isArray((currentFsg?.parsedData as { lines?: unknown[] } | null)?.lines)
    ? ((currentFsg?.parsedData as { lines?: unknown[] }).lines ?? [])
    : []
  const rawNextLines = Array.isArray((nextFsg?.parsedData as { lines?: unknown[] } | null)?.lines)
    ? ((nextFsg?.parsedData as { lines?: unknown[] }).lines ?? [])
    : []
  const hasLegacyBudgetData = rawBudgetLines.length > 0 && budgetLines.length === 0
  const hasLegacyFsgData =
    (rawCurrentLines.length > 0 && currentLines.length === 0) ||
    (rawNextLines.length > 0 && nextLines.length === 0)

  const currentDate = formatDate(getFsgReportDate(currentFsg?.parsedData))
  const nextDate = formatDate(getFsgReportDate(nextFsg?.parsedData))
  const budgetDate = budget ? formatDate(budget.uploadedAt) : null

  // ─── Build lookup maps ────────────────────────────────────

  const budgetMap = new Map<string, BudgetLine>()
  for (const l of budgetLines) budgetMap.set(`${l.accountCode}|${l.objectCode}`, l)

  const currentMap = new Map<string, FsgLine>()
  for (const l of currentLines) currentMap.set(`${l.accountCode}|${l.objectCode}`, l)

  const nextMap = new Map<string, FsgLine>()
  for (const l of nextLines) nextMap.set(`${l.accountCode}|${l.objectCode}`, l)

  // Union of all acct+obj keys across all three sources
  const allKeys = new Set<string>([
    ...budgetMap.keys(),
    ...currentMap.keys(),
    ...nextMap.keys(),
  ])

  // Collect unique accountCodes, sorted numerically
  const accountCodes = [
    ...new Set([...allKeys].map((k) => k.split("|")[0])),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  // Description lookup (budget preferred, then FSG current, then FSG next)
  function getDesc(acct: string, obj: string): string {
    const key = `${acct}|${obj}`
    return (
      budgetMap.get(key)?.description ??
      currentMap.get(key)?.description ??
      nextMap.get(key)?.description ??
      ""
    )
  }

  // ─── Totals ───────────────────────────────────────────────

  const totalBudget = budgetLines.reduce((s, l) => s + l.amount, 0)
  const totalCurrentITD = currentLines.reduce((s, l) => s + l.inceptionToDate, 0)
  const totalNextITD = nextLines.reduce((s, l) => s + l.inceptionToDate, 0)
  const totalSpent = [...allKeys].reduce((sum, key) => {
    const currentITD = currentMap.get(key)?.inceptionToDate ?? 0
    const nextITD = nextMap.get(key)?.inceptionToDate ?? 0
    return sum + Math.max(currentITD, nextITD)
  }, 0)
  const variance = totalBudget - totalSpent
  const rawPctUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
  const pctUsed = Math.min(rawPctUsed, 100)

  // Sanity: sum of all budget lines vs budget total field
  const budgetData = budget?.parsedData as BudgetData | null
  const budgetTotalField = budgetData?.totalAmount ?? null
  const mismatch =
    budgetTotalField !== null && Math.abs(budgetTotalField - totalBudget) > 0.01

  const hasAnyData = budgetLines.length > 0 || currentLines.length > 0 || nextLines.length > 0

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Budget" value={usd(totalBudget)} accent="muted" />
        <StatCard label="Total Spent (Latest ITD)" value={usd(totalSpent)} accent="cobalt" />
        <StatCard
          label="Variance"
          value={usd(Math.abs(variance))}
          accent={variance >= 0 ? "green" : "red"}
          sub={
            <span
              className={`text-xs font-medium ${
                variance >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {variance >= 0 ? "Under budget" : "Over budget"}
            </span>
          }
        />
        <StatCard
          label="% Utilized"
          value={`${pctUsed.toFixed(1)}%`}
          accent={rawPctUsed > 100 ? "red" : rawPctUsed > 90 ? "amber" : "cobalt"}
          sub={
            <div className="mt-1 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  rawPctUsed > 100 ? "bg-red-500" : rawPctUsed > 90 ? "bg-amber-400" : "bg-cobalt"
                }`}
                style={{ width: `${Math.min(pctUsed, 100)}%` }}
              />
            </div>
          }
        />
      </div>

      {/* Sanity banner */}
      {mismatch && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <span className="text-amber-500 mt-0.5">!</span>
          <p className="text-sm text-amber-800">
            Budget and reconciliation totals do not match. The uploaded budget file total (
            {usd(budgetTotalField!)}) differs from the sum of all budget lines ({usd(totalBudget)}).
            Consider re-uploading the budget file.
          </p>
        </div>
      )}

      {/* Reconciliation table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-baseline gap-4">
          <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wide flex-1">
            Budget vs. Actuals by Function × Object
          </p>
          <div className="flex items-center gap-4 text-xs text-charcoal-muted">
            {budgetDate && <span>Budget: {budgetDate}</span>}
            {currentDate && <span>FSG Current: {currentDate}</span>}
            {nextDate && <span>FSG Next: {nextDate}</span>}
          </div>
        </div>

        {!hasAnyData ? (
          <div className="py-16 text-center">
            <p className="text-charcoal-muted text-sm">No data available.</p>
            <p className="text-xs text-gray-400 mt-1">
              {hasLegacyBudgetData || hasLegacyFsgData
                ? "At least one uploaded file uses the older parsed-data format. Re-upload the budget/FSG files to populate reconciliation."
                : "Upload a budget and at least one FSG report to see reconciliation."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-border text-xs font-medium text-charcoal-muted uppercase tracking-wide sticky top-0 z-10">
                  <th className="px-4 py-3 text-left">Acct</th>
                  <th className="px-4 py-3 text-left">Object</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">Budget</th>
                  <th className="px-4 py-3 text-right">FSG Current</th>
                  <th className="px-4 py-3 text-right">FSG Next</th>
                  <th className="px-4 py-3 text-right">Total Program Cost</th>
                  <th className="px-4 py-3 text-right">Budget Line Overrun</th>
                </tr>
              </thead>
              <tbody>
                {accountCodes.map((acct) => {
                  const objCodes = [
                    ...new Set(
                      [...allKeys]
                        .filter((k) => k.startsWith(`${acct}|`))
                        .map((k) => k.split("|")[1])
                    ),
                  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

                  const acctBudget = objCodes.reduce(
                    (s, obj) => s + (budgetMap.get(`${acct}|${obj}`)?.amount ?? 0),
                    0
                  )
                  const acctCurrentITD = objCodes.reduce(
                    (s, obj) => s + (currentMap.get(`${acct}|${obj}`)?.inceptionToDate ?? 0),
                    0
                  )
                  const acctNextITD = objCodes.reduce(
                    (s, obj) => s + (nextMap.get(`${acct}|${obj}`)?.inceptionToDate ?? 0),
                    0
                  )
                  const acctTotal = objCodes.reduce((s, obj) => {
                    const currentITD = currentMap.get(`${acct}|${obj}`)?.inceptionToDate ?? 0
                    const nextITD = nextMap.get(`${acct}|${obj}`)?.inceptionToDate ?? 0
                    return s + Math.max(currentITD, nextITD)
                  }, 0)

                  return (
                    <>
                      {/* Account group header */}
                      <tr
                        key={`group-${acct}`}
                        className="bg-cobalt/5 border-y border-cobalt/10"
                      >
                        <td
                          colSpan={3}
                          className="px-4 py-2 font-semibold text-cobalt text-xs uppercase tracking-wide"
                        >
                          {acct}
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-semibold text-charcoal tabular-nums">
                          {acctBudget !== 0 ? usd(acctBudget) : "—"}
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-semibold text-charcoal tabular-nums">
                          {acctCurrentITD !== 0 ? usd(acctCurrentITD) : "—"}
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-semibold text-charcoal tabular-nums">
                          {acctNextITD !== 0 ? usd(acctNextITD) : "—"}
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-semibold text-charcoal tabular-nums">
                          {acctTotal !== 0 ? usd(acctTotal) : "—"}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {acctBudget !== 0 || acctTotal !== 0 ? (
                            <OverrunChip budget={acctBudget} spent={acctTotal} />
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Detail rows */}
                      {objCodes.map((obj, i) => {
                        const key = `${acct}|${obj}`
                        const budgetLine = budgetMap.get(key)
                        const currentLine = currentMap.get(key)
                        const nextLine = nextMap.get(key)
                        const budgetAmt = budgetLine?.amount ?? null
                        const currentITD = currentLine?.inceptionToDate ?? 0
                        const nextITD = nextLine?.inceptionToDate ?? 0
                        const total = Math.max(currentITD, nextITD)

                        return (
                          <tr
                            key={key}
                            className={`border-b border-border hover:bg-gray-50/60 transition-colors ${
                              i % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                            }`}
                          >
                            <td className="px-4 py-3 text-charcoal-muted text-xs">{acct}</td>
                            <td className="px-4 py-3 font-medium text-charcoal">{obj}</td>
                            <td className="px-4 py-3 text-charcoal">{getDesc(acct, obj)}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-charcoal">
                              {budgetAmt !== null ? usd(budgetAmt) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-charcoal">
                              {currentITD !== 0 ? usd(currentITD) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-charcoal">
                              {nextITD !== 0 ? usd(nextITD) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-medium text-charcoal">
                              {total !== 0 ? usd(total) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <OverrunChip budget={budgetAmt} spent={total} />
                            </td>
                          </tr>
                        )
                      })}
                    </>
                  )
                })}

                {/* Grand total footer */}
                <tr className="bg-cobalt/10 font-bold border-t-2 border-cobalt/30">
                  <td colSpan={3} className="px-4 py-3 text-charcoal">
                    Grand Total
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-charcoal">
                    {totalBudget !== 0 ? usd(totalBudget) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-charcoal">
                    {totalCurrentITD !== 0 ? usd(totalCurrentITD) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-charcoal">
                    {totalNextITD !== 0 ? usd(totalNextITD) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-cobalt">
                    {usd(totalSpent)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <OverrunChip budget={totalBudget} spent={totalSpent} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
