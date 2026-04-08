"use client"

import { useState } from "react"
import { ContractDetail } from "@/types"

type Props = {
  contract: ContractDetail
  canEdit: boolean
}

type FsgPeriod = "current" | "next"

type ParsedFsgData = {
  reportTitle?: string
  grantName?: string
  reportDate?: string
  reportGeneratedAt?: string
  reportGeneratedLabel?: string
  grantValues?: string[]
  lines?: {
    accountCode?: string   // present in new parser format
    functionDescription?: string
    objectCode: string
    objectDescription?: string
    description: string
    currentPeriod: number
    inceptionToDate: number
  }[]
  totalCurrentPeriod?: number
  totalInceptionToDate?: number
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-")
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function GrantFsgTab({ contract, canEdit }: Props) {
  const [uploading, setUploading] = useState<FsgPeriod | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activePeriod, setActivePeriod] = useState<FsgPeriod>("current")

  const currentReport = contract.fsgReports.find((r) => r.period === "current") ?? null
  const nextReport = contract.fsgReports.find((r) => r.period === "next") ?? null
  const activeReport = activePeriod === "current" ? currentReport : nextReport

  async function handleUpload(file: File, period: FsgPeriod) {
    setUploading(period)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("period", period)

      const res = await fetch(`/api/grants-isbe/${contract.id}/fsg/upload`, {
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
      setUploading(null)
    }
  }

  return (
    <div>
      {/* Period toggle — only show "Next" tab if it exists or it's FY crossover */}
      <div className="flex gap-2 mb-6">
        {(["current", "next"] as FsgPeriod[]).map((p) => {
          const report = p === "current" ? currentReport : nextReport
          const label = p === "current" ? "Current Period" : "Next Period (FY Crossover)"
          if (p === "next" && !nextReport && !canEdit) return null
          return (
            <button
              key={p}
              onClick={() => setActivePeriod(p)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                activePeriod === p
                  ? "bg-cobalt text-white border-cobalt"
                  : "bg-white text-charcoal-muted border-border hover:border-cobalt/50"
              }`}
            >
              {label}
              {report && (
                <span className={`ml-1.5 text-xs ${activePeriod === p ? "text-cobalt-light" : "text-green-600"}`}>
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>

      {activeReport ? (
        <FsgReportView
          report={activeReport}
          canEdit={canEdit}
          period={activePeriod}
          onUpload={handleUpload}
          uploading={uploading === activePeriod}
        />
      ) : (
        <FsgUploadPrompt
          period={activePeriod}
          canEdit={canEdit}
          batchCode={contract.batchCode}
          onUpload={handleUpload}
          uploading={uploading === activePeriod}
        />
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  )
}

function FsgUploadPrompt({
  period,
  canEdit,
  batchCode,
  onUpload,
  uploading,
}: {
  period: FsgPeriod
  canEdit: boolean
  batchCode: string | null
  onUpload: (file: File, period: FsgPeriod) => void
  uploading: boolean
}) {
  const isPending = batchCode === "Need" || !batchCode

  return (
    <div className="text-center py-12 border border-dashed border-border rounded-lg">
      {isPending ? (
        <>
          <p className="text-charcoal-muted text-sm font-medium mb-1">Batch Code Pending</p>
          <p className="text-charcoal-muted text-xs">
            FSG report not yet available — ISBE batch code has not been assigned.
          </p>
        </>
      ) : (
        <>
          <p className="text-charcoal-muted text-sm mb-1">No FSG report uploaded yet.</p>
          <p className="text-charcoal-muted text-xs mb-4">
            Download from Oracle for batch <span className="font-mono font-medium">{batchCode}</span> and upload the PDF here.
          </p>
          {canEdit && (
            <label className={`cursor-pointer inline-flex items-center px-4 py-2 bg-cobalt text-white text-sm font-medium rounded-md hover:bg-cobalt-dark transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
              {uploading ? "Parsing PDF…" : "Upload FSG PDF"}
              <input
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onUpload(f, period)
                }}
              />
            </label>
          )}
        </>
      )}
    </div>
  )
}

function FsgReportView({
  report,
  canEdit,
  period,
  onUpload,
  uploading,
}: {
  report: ContractDetail["fsgReports"][0]
  canEdit: boolean
  period: FsgPeriod
  onUpload: (file: File, period: FsgPeriod) => void
  uploading: boolean
}) {
  const data = report.parsedData as ParsedFsgData | null
  const hasAccountCode = data?.lines?.some((l) => l.accountCode) ?? false
  const hasFunctionDescription = data?.lines?.some((l) => l.functionDescription) ?? false

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-charcoal-muted">
            Uploaded {new Date(report.uploadedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            {report.uploadedBy && ` by ${report.uploadedBy.name ?? report.uploadedBy.email}`}
          </p>
          {data?.reportDate && (
            <p className="text-xs text-charcoal-muted mt-0.5">Report date: {data.reportDate}</p>
          )}
        </div>
        {canEdit && (
          <label className={`cursor-pointer text-sm text-cobalt hover:underline ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
            {uploading ? "Parsing…" : "Re-upload"}
            <input
              type="file"
              className="hidden"
              accept=".pdf"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onUpload(f, period)
              }}
            />
          </label>
        )}
      </div>

      <div className="mb-5 rounded-xl border border-border bg-white px-5 py-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
          FSG Report Metadata
        </p>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
          {[
            ["Report Title", data?.reportTitle],
            ["Grant Name", data?.grantName],
            ["Grant Code", data?.grantValues?.join(", ") || null],
            ["Report Date", formatDate(data?.reportDate)],
            ["Generated At", formatDate(data?.reportGeneratedAt)],
            ["Generated Label", data?.reportGeneratedLabel],
            ["Period", period === "current" ? "Current" : "Next (FY Crossover)"],
            [
              "Uploaded",
              new Date(report.uploadedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="mb-0.5 text-xs font-medium uppercase tracking-wide text-charcoal-muted">
                {label}
              </dt>
              <dd className="text-charcoal">{value || <span className="italic text-gray-400">—</span>}</dd>
            </div>
          ))}
        </dl>
      </div>

      {data?.lines && data.lines.length > 0 ? (
        <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              {hasAccountCode && (
                <th className="text-left px-4 py-2.5 font-medium text-charcoal-muted">Function Code</th>
              )}
              {hasFunctionDescription && (
                <th className="text-left px-4 py-2.5 font-medium text-charcoal-muted">Function</th>
              )}
              <th className="text-left px-4 py-2.5 font-medium text-charcoal-muted">Object Code</th>
              <th className="text-left px-4 py-2.5 font-medium text-charcoal-muted">Object</th>
              <th className="text-right px-4 py-2.5 font-medium text-charcoal-muted">Current Period</th>
              <th className="text-right px-4 py-2.5 font-medium text-charcoal-muted">Inception to Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.lines.map((line, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {hasAccountCode && (
                  <td className="px-4 py-2 font-mono text-xs text-charcoal-muted">
                    {line.accountCode ?? "—"}
                  </td>
                )}
                {hasFunctionDescription && (
                  <td className="px-4 py-2 text-charcoal">
                    {line.functionDescription ?? <span className="text-gray-400">—</span>}
                  </td>
                )}
                <td className="px-4 py-2 font-mono text-xs">{line.objectCode}</td>
                <td className="px-4 py-2 text-charcoal">
                  {line.objectDescription ?? line.description}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                    line.currentPeriod
                  )}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                    line.inceptionToDate
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {(data.totalCurrentPeriod != null || data.totalInceptionToDate != null) && (
            <tfoot className="bg-gray-50 border-t border-border">
              <tr>
                <td
                  colSpan={hasAccountCode ? (hasFunctionDescription ? 4 : 3) : hasFunctionDescription ? 3 : 2}
                  className="px-4 py-2.5 font-medium text-charcoal"
                >
                  Total
                </td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums text-charcoal">
                  {data.totalCurrentPeriod != null &&
                    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                      data.totalCurrentPeriod
                    )}
                </td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums text-charcoal">
                  {data.totalInceptionToDate != null &&
                    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                      data.totalInceptionToDate
                    )}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      ) : (
        <p className="text-sm text-charcoal-muted">FSG uploaded — line items not yet parsed.</p>
      )}
    </div>
  )
}
