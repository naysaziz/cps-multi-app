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

  const upload = contract.budgetUploads[0] ?? null
  const parsedLines = upload?.parsedData as {
    objectCode: string
    description: string
    amount: number
  }[] | null

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("contractId", contract.id)
      formData.append("fiscalYear", contract.fiscalYear.toString())

      const res = await fetch(`/api/grants-isbe/${contract.id}/budget/upload`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Upload failed")
      }

      // Reload page to show new data
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
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
                  <th className="text-left px-4 py-2.5 font-medium text-charcoal-muted">Object Code</th>
                  <th className="text-left px-4 py-2.5 font-medium text-charcoal-muted">Description</th>
                  <th className="text-right px-4 py-2.5 font-medium text-charcoal-muted">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedLines.map((line, i) => (
                  <tr key={i} className="hover:bg-gray-50">
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
                  <td colSpan={2} className="px-4 py-2.5 font-medium text-charcoal">Total</td>
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
    </div>
  )
}
