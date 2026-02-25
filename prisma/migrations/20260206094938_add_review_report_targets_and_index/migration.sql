-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "targetReviewId" INTEGER;

-- CreateIndex
CREATE INDEX "Report_targetReviewId_idx" ON "Report"("targetReviewId");
