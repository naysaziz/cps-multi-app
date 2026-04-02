"use client"

import { ContractDetail } from "@/types"

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-charcoal-muted uppercase tracking-wide mb-0.5">
        {label}
      </dt>
      <dd className="text-sm text-charcoal">{value || <span className="text-gray-400 italic">—</span>}</dd>
    </div>
  )
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatCurrency(v: string | null | undefined) {
  if (!v) return null
  const n = parseFloat(v)
  if (isNaN(n)) return v
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

export default function GrantInfoTab({ contract }: { contract: ContractDetail }) {
  return (
    <div className="space-y-8">
      {/* Grant identifiers */}
      <section>
        <h2 className="text-sm font-semibold text-charcoal mb-4 pb-2 border-b border-border">
          Grant Identifiers
        </h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          <Field label="Contract No" value={contract.contractNo} />
          <Field label="Batch Code" value={contract.batchCode === "Need" ? "Pending (Need)" : contract.batchCode} />
          <Field label="Fund" value={contract.fund} />
          <Field label="Unit" value={contract.unit} />
          <Field label="Revenue Account" value={contract.revenueAccount} />
          <Field label="ALN" value={contract.aln} />
        </dl>
      </section>

      {/* Dates */}
      <section>
        <h2 className="text-sm font-semibold text-charcoal mb-4 pb-2 border-b border-border">
          Dates
        </h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
          <Field label="Project Start" value={formatDate(contract.projectStartDate)} />
          <Field label="Project End" value={formatDate(contract.projectEndDate)} />
          <Field label="Completion Report" value={formatDate(contract.completionReportDate)} />
          <Field label="Final Report" value={formatDate(contract.finalReportDate)} />
        </dl>
      </section>

      {/* Financials */}
      <section>
        <h2 className="text-sm font-semibold text-charcoal mb-4 pb-2 border-b border-border">
          Financials
        </h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          <Field label="Commitment Amount" value={formatCurrency(contract.commitmentAmount)} />
          <Field label="A/R" value={formatCurrency(contract.arAmount)} />
          <Field label="Funding Source" value={contract.fundingSource} />
        </dl>
      </section>

      {/* Contacts */}
      <section>
        <h2 className="text-sm font-semibold text-charcoal mb-4 pb-2 border-b border-border">
          Contacts
        </h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          <Field label="CPS Budget Person" value={contract.cpsBudgetPerson} />
          <Field label="ISBE Contact" value={contract.isbeContactPerson} />
          <Field label="ISBE Phone" value={contract.isbePhone} />
          <Field label="ISBE Fax" value={contract.isbeFax} />
          <Field label="Agency Location" value={contract.agencyLocation} />
        </dl>
        {contract.isbeContactDirectoryUrl && (
          <div className="mt-3">
            <a
              href={contract.isbeContactDirectoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cobalt hover:underline"
            >
              ISBE Contact Directory →
            </a>
          </div>
        )}
      </section>
    </div>
  )
}
