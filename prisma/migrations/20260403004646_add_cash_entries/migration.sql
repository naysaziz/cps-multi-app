-- CreateTable
CREATE TABLE "cash_entries" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "invoiceNo" TEXT,
    "claimPeriod" TEXT,
    "accountingPeriodDate" TIMESTAMP(3),
    "claimedAmount" DECIMAL(14,2),
    "cashReceipts" DECIMAL(14,2),
    "advanceOffset" DECIMAL(14,2),
    "comments" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
