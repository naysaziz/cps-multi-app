-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "isbeCarryover" DECIMAL(14,2),
ADD COLUMN     "isbeOutstandingObligs" DECIMAL(14,2),
ADD COLUMN     "isbeVoucheredToDate" DECIMAL(14,2);
