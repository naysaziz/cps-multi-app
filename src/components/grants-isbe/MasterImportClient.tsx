"use client"

import { useState } from "react"

type ParsedRow = {
  contractNo: string
  grantName: string
  grantValues: string[]
  batchCode?: string
  fund?: string
  unit?: string
  revenueAccount?: string
  aln?: string
  programPeriod?: string
  projectStartDate?: string
  projectEndDate?: string
  completionReportDate?: string
  finalReportDate?: string
  commitmentAmount?: number
  cpsBudgetPerson?: string
  isbeContactPerson?: string
  isbePhone?: string
  isbeFax?: string
  agencyLocation?: string
  isbeContactDirectoryUrl?: string
  fiscalYear: number
}

// Column mapping from the master sheet header row
const COL = {
  grantName: 0,
  fundingSource: 1,
  contractNo: 2,
  programPeriod: 3,
  completionReportDate: 4,
  finalReportDate: 5,
  grantValues: 6,       // May contain comma-separated or range values
  batchCode: 7,
  cpsBudgetPerson: 9,
  fund: 10,
  unit: 11,
  revenueAccount: 12,
  aln: 13,
  isbePhone: 14,
  isbeFax: 15,
  isbeContactPerson: 16,
  agencyLocation: 19,
  projectStartDate: 20,
  projectEndDate: 21,
  isbeContactDirectoryUrl: 22,
  commitmentAmount: 23,
}

function parseGrantValues(raw: string): string[] {
  if (!raw) return []
  // Handle ranges like "440054-440055" or comma-separated "430000,430700,430308-430320"
  return raw.split(",").map((s) => s.trim()).filter(Boolean)
}

function parseDate(raw: string): string | undefined {
  if (!raw) return undefined
  const d = new Date(raw)
  return isNaN(d.getTime()) ? undefined : d.toISOString()
}

function parseAmount(raw: string): number | undefined {
  if (!raw) return undefined
  const n = parseFloat(raw.replace(/[$,]/g, ""))
  return isNaN(n) ? undefined : n
}

function csvRowToContract(row: string[], fiscalYear: number): ParsedRow | null {
  const contractNo = row[COL.contractNo]?.trim()
  const grantName = row[COL.grantName]?.trim()
  if (!grantName) return null
  // Use grantValues as fallback contractNo if contractNo is blank
  const effectiveContractNo = contractNo || `NO-CONTRACT-${row[COL.grantValues]?.trim()}`

  return {
    contractNo: effectiveContractNo,
    grantName,
    grantValues: parseGrantValues(row[COL.grantValues] ?? ""),
    batchCode: row[COL.batchCode]?.trim() || undefined,
    fund: row[COL.fund]?.trim() || undefined,
    unit: row[COL.unit]?.trim() || undefined,
    revenueAccount: row[COL.revenueAccount]?.trim() || undefined,
    aln: row[COL.aln]?.trim() || undefined,
    programPeriod: row[COL.programPeriod]?.trim() || undefined,
    projectStartDate: parseDate(row[COL.projectStartDate] ?? ""),
    projectEndDate: parseDate(row[COL.projectEndDate] ?? ""),
    completionReportDate: parseDate(row[COL.completionReportDate] ?? ""),
    finalReportDate: parseDate(row[COL.finalReportDate] ?? ""),
    commitmentAmount: parseAmount(row[COL.commitmentAmount] ?? ""),
    cpsBudgetPerson: row[COL.cpsBudgetPerson]?.trim() || undefined,
    isbeContactPerson: row[COL.isbeContactPerson]?.trim() || undefined,
    isbePhone: row[COL.isbePhone]?.trim() || undefined,
    isbeFax: row[COL.isbeFax]?.trim() || undefined,
    agencyLocation: row[COL.agencyLocation]?.trim() || undefined,
    isbeContactDirectoryUrl: row[COL.isbeContactDirectoryUrl]?.trim() || undefined,
    fiscalYear,
  }
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    if (!line.trim()) continue
    // Simple CSV parse — handles quoted fields
    const cells: string[] = []
    let current = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === "," && !inQuotes) {
        cells.push(current)
        current = ""
      } else {
        current += ch
      }
    }
    cells.push(current)
    rows.push(cells)
  }
  return rows
}

export default function MasterImportClient() {
  const [preview, setPreview] = useState<ParsedRow[]>([])
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear() + 1)
  const [fileName, setFileName] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)
    setError(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = parseCSV(text)
      // Skip header row (row 0)
      const contracts = rows
        .slice(1)
        .map((r) => csvRowToContract(r, fiscalYear))
        .filter((c): c is ParsedRow => c !== null)
      setPreview(contracts)
    }
    reader.readAsText(file)
  }

  async function runImport() {
    if (preview.length === 0) return
    setImporting(true)
    setError(null)

    try {
      const res = await fetch("/api/grants-isbe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contracts: preview }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Import failed")
      }

      const data = await res.json()
      setResult(data)
      setPreview([])
      setFileName(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Fiscal year + file picker */}
      <div className="bg-white border border-border rounded-lg p-6">
        <div className="flex items-end gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">
              Fiscal Year
            </label>
            <input
              type="number"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(parseInt(e.target.value))}
              className="w-28 px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-cobalt/30"
            />
          </div>
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm text-charcoal hover:bg-gray-50 transition-colors">
            {fileName ?? "Choose CSV file…"}
            <input type="file" className="hidden" accept=".csv" onChange={handleFile} />
          </label>
        </div>
        <p className="text-xs text-charcoal-muted">
          Export the FY Grants sheet as CSV. The first row must be the header row matching the
          master sheet column order.
        </p>
      </div>

      {/* Success result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          ✓ Import complete — {result.imported} contracts saved
          {result.failed > 0 && `, ${result.failed} failed`}.
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-charcoal">
              Preview — {preview.length} contracts parsed
            </p>
            <button
              onClick={runImport}
              disabled={importing}
              className="px-4 py-2 text-sm font-medium bg-cobalt text-white rounded-md hover:bg-cobalt-dark disabled:opacity-50 transition-colors"
            >
              {importing ? "Importing…" : `Import ${preview.length} Contracts`}
            </button>
          </div>

          <div className="bg-white border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-charcoal-muted">Grant Name</th>
                  <th className="text-left px-3 py-2 font-medium text-charcoal-muted">Contract No</th>
                  <th className="text-left px-3 py-2 font-medium text-charcoal-muted">Grant Values</th>
                  <th className="text-left px-3 py-2 font-medium text-charcoal-muted">Batch Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-charcoal max-w-xs">
                      <span className="line-clamp-1">{row.grantName}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-charcoal-muted">{row.contractNo}</td>
                    <td className="px-3 py-2 text-charcoal-muted">{row.grantValues.join(", ")}</td>
                    <td className="px-3 py-2 text-charcoal-muted">
                      {row.batchCode ?? <span className="italic text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
