"use client"

import { useState } from "react"
import { ContractDetail } from "@/types"

type Props = {
  contract: ContractDetail
  canEdit: boolean
}

export default function GrantBudgetTab({ contract, canEdit }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerFile, setPickerFile] = useState<File | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState("")

  const upload = contract.budgetUploads[0] ?? null

  type BudgetLine = {
    accountCode?: string   // present in new parser format
    objectCode: string
    description: string
    amount: number
  }
  type BudgetParsedData = { lines: BudgetLine[]; totalAmount?: number }

  const parsedData = upload?.parsedData as BudgetParsedData | null
  // Support both old format (direct array) and new format ({ lines: [...] })
  const parsedLines: BudgetLine[] | null = Array.isArray(parsedData)
    ? (parsedData as unknown as BudgetLine[])
    : parsedData?.lines ?? null

  const hasAccountCode = parsedLines?.some((l) => l.accountCode) ?? false

  async function uploadFile(file: File, sheetName?: string) {
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("contractId", contract.id)
      formData.append("fiscalYear", contract.fiscalYear.toString())
      if (sheetName) formData.append("sheetName", sheetName)

      const res = await fetch(`/api/grants-isbe/${contract.id}/budget/upload`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Upload failed")
      }

      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    const lowerName = file.name.toLowerCase()
    const isExcel = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")

    if (!isExcel) {
      await uploadFile(file)
      return
    }

    try {
      const XLSX = await import("xlsx")
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      const tabs = workbook.SheetNames

      if (tabs.length === 0) {
        throw new Error("This workbook does not contain any tabs.")
      }

      const preferred = tabs.find((name) => name.toLowerCase() === "budget") ?? tabs[0]
      setPickerFile(file)
      setSheetNames(tabs)
      setSelectedSheet(preferred)
      setPickerOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read workbook tabs")
    }
  }

  async function confirmSheetSelection() {
    if (!pickerFile || !selectedSheet) return
    setPickerOpen(false)
    await uploadFile(pickerFile, selectedSheet)
    setPickerFile(null)
  }

  function closePicker() {
    if (uploading) return
    setPickerOpen(false)
    setPickerFile(null)
    setSheetNames([])
    setSelectedSheet("")
  }

  return (
    <div>
      {upload ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-charcoal">
                FY{upload.fiscalYear} Budget
              </h3>
              <p className="text-xs text-charcoal-muted mt-0.5">
                Uploaded {new Date(upload.uploadedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {upload.uploadedBy && ` by ${upload.uploadedBy.name ?? upload.uploadedBy.email}`}
              </p>
            </div>
            {canEdit && (
              <label className="cursor-pointer text-sm text-cobalt hover:underline">
                Replace
                <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
              </label>
            )}
          </div>

          {parsedLines && parsedLines.length > 0 ? (
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  {hasAccountCode && (
                    <th className="text-left px-4 py-2.5 font-medium text-charcoal-muted">Function Code</th>
                  )}
                  <th className="text-left px-4 py-2.5 font-medium text-charcoal-muted">Object Code</th>
                  <th className="text-left px-4 py-2.5 font-medium text-charcoal-muted">Description</th>
                  <th className="text-right px-4 py-2.5 font-medium text-charcoal-muted">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedLines.map((line, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {hasAccountCode && (
                      <td className="px-4 py-2 font-mono text-xs text-charcoal-muted">
                        {line.accountCode ?? "—"}
                      </td>
                    )}
                    <td className="px-4 py-2 font-mono text-xs">{line.objectCode}</td>
                    <td className="px-4 py-2 text-charcoal">{line.description}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(line.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-border">
                <tr>
                  <td colSpan={hasAccountCode ? 3 : 2} className="px-4 py-2.5 font-medium text-charcoal">Total</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums text-charcoal">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(parsedLines.reduce((sum, l) => sum + l.amount, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <p className="text-sm text-charcoal-muted">Budget uploaded but no line items parsed.</p>
          )}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-charcoal-muted text-sm mb-1">No budget uploaded yet.</p>
          <p className="text-charcoal-muted text-xs mb-4">
            Download from ISBE Frizz and upload the Excel file here.
          </p>
          {canEdit && (
            <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-cobalt text-white text-sm font-medium rounded-md hover:bg-cobalt-dark transition-colors">
              Upload Budget
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
            </label>
          )}
        </div>
      )}

      {uploading && (
        <p className="mt-3 text-sm text-charcoal-muted">Parsing budget file…</p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white shadow-xl">
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-base font-semibold text-charcoal">Choose Budget Tab</h3>
              <p className="mt-1 text-sm text-charcoal-muted">
                This Excel file has multiple tabs. Select the worksheet that contains the budget data.
              </p>
            </div>
            <div className="space-y-3 px-6 py-5">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-charcoal-muted">
                  Workbook Tabs
                </span>
                <select
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cobalt/30"
                >
                  {sheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-charcoal-muted">
                Available tabs: {sheetNames.join(", ")}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button
                onClick={closePicker}
                className="rounded-lg border border-border px-4 py-2 text-sm text-charcoal-muted hover:text-charcoal"
              >
                Cancel
              </button>
              <button
                onClick={confirmSheetSelection}
                disabled={!selectedSheet}
                className="rounded-lg bg-cobalt px-4 py-2 text-sm text-white hover:bg-cobalt-dark disabled:opacity-50"
              >
                Import Selected Tab
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
