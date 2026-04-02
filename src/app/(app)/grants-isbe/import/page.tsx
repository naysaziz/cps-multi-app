import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import MasterImportClient from "@/components/grants-isbe/MasterImportClient"

export default async function GrantImportPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const isDirector =
    session.user.isSuperAdmin ||
    session.user.permissions.includes("grants_isbe:edit") ||
    session.user.permissions.includes("grants_isbe:manage")

  if (!isDirector) redirect("/grants-isbe")

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <a
          href="/grants-isbe"
          className="text-sm text-cobalt hover:underline flex items-center gap-1 mb-6"
        >
          ← All Grants
        </a>
        <h1 className="text-2xl font-semibold text-charcoal">Import Master Grant List</h1>
        <p className="text-charcoal-muted text-sm mt-1">
          Upload the FY master list CSV to seed all contracts for a new fiscal year. Existing
          contracts will be updated; new ones will be created.
        </p>
      </div>

      <MasterImportClient />
    </div>
  )
}
