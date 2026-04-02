-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "contractNo" TEXT NOT NULL,
    "grantName" TEXT NOT NULL,
    "fundingSource" TEXT NOT NULL DEFAULT 'Illinois State Board of Education',
    "grantValues" TEXT[],
    "batchCode" TEXT,
    "fund" TEXT,
    "unit" TEXT,
    "revenueAccount" TEXT,
    "aln" TEXT,
    "programPeriod" TEXT,
    "projectStartDate" TIMESTAMP(3),
    "projectEndDate" TIMESTAMP(3),
    "completionReportDate" TIMESTAMP(3),
    "finalReportDate" TIMESTAMP(3),
    "commitmentAmount" DECIMAL(14,2),
    "cpsBudgetPerson" TEXT,
    "isbeContactPerson" TEXT,
    "isbePhone" TEXT,
    "isbeFax" TEXT,
    "agencyLocation" TEXT,
    "isbeContactDirectoryUrl" TEXT,
    "arAmount" DECIMAL(14,2),
    "fiscalYear" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grant_assignments" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grant_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fsg_reports" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "pdfStorageKey" TEXT,
    "parsedData" JSONB,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fsg_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_uploads" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "fileStorageKey" TEXT,
    "parsedData" JSONB,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contractNo_key" ON "contracts"("contractNo");

-- CreateIndex
CREATE UNIQUE INDEX "grant_assignments_contractId_userId_key" ON "grant_assignments"("contractId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "fsg_reports_contractId_period_key" ON "fsg_reports"("contractId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "budget_uploads_contractId_fiscalYear_key" ON "budget_uploads"("contractId", "fiscalYear");

-- AddForeignKey
ALTER TABLE "grant_assignments" ADD CONSTRAINT "grant_assignments_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_assignments" ADD CONSTRAINT "grant_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fsg_reports" ADD CONSTRAINT "fsg_reports_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fsg_reports" ADD CONSTRAINT "fsg_reports_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_uploads" ADD CONSTRAINT "budget_uploads_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_uploads" ADD CONSTRAINT "budget_uploads_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
