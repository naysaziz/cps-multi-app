export type AppTile = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  route: string
  isActive: boolean
  sortOrder: number
  requiredPermission: string | null
}

export type UserWithRoles = {
  id: string
  name: string | null
  email: string | null
  image: string | null
  isActive: boolean
  createdAt: Date
  roles: { id: string; name: string; displayName: string }[]
}

export type ContractSummary = {
  id: string
  contractNo: string
  grantName: string
  fundingSource: string
  grantValues: string[]
  batchCode: string | null
  fund: string | null
  unit: string | null
  aln: string | null
  projectStartDate: string | null
  projectEndDate: string | null
  commitmentAmount: string | null
  fiscalYear: number
  isActive: boolean
  assignments: {
    id: string
    role: string
    user: { id: string; name: string | null; email: string | null }
  }[]
  fsgReports: { id: string; period: string; uploadedAt: string }[]
  budgetUploads: { id: string; fiscalYear: number; uploadedAt: string }[]
}

export type ContractDetail = Omit<ContractSummary, "fsgReports" | "budgetUploads"> & {
  canEdit: boolean
  programPeriod: string | null
  revenueAccount: string | null
  completionReportDate: string | null
  finalReportDate: string | null
  cpsBudgetPerson: string | null
  isbeContactPerson: string | null
  isbePhone: string | null
  isbeFax: string | null
  agencyLocation: string | null
  isbeContactDirectoryUrl: string | null
  arAmount: string | null
  fsgReports: {
    id: string
    period: string
    uploadedAt: string
    parsedData: unknown
    uploadedBy: { name: string | null; email: string | null } | null
  }[]
  budgetUploads: {
    id: string
    fiscalYear: number
    uploadedAt: string
    parsedData: unknown
    uploadedBy: { name: string | null; email: string | null } | null
  }[]
}

export type RoleWithPermissions = {
  id: string
  name: string
  displayName: string
  description: string | null
  isSystem: boolean
  permissions: { id: string; resource: string; action: string }[]
}
