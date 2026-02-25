-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "targetProductMessageId" INTEGER,
ADD COLUMN     "targetStreamMessageId" INTEGER;

-- CreateIndex
CREATE INDEX "Report_targetUserId_idx" ON "Report"("targetUserId");

-- CreateIndex
CREATE INDEX "Report_targetProductId_idx" ON "Report"("targetProductId");

-- CreateIndex
CREATE INDEX "Report_targetPostId_idx" ON "Report"("targetPostId");

-- CreateIndex
CREATE INDEX "Report_targetCommentId_idx" ON "Report"("targetCommentId");

-- CreateIndex
CREATE INDEX "Report_targetStreamId_idx" ON "Report"("targetStreamId");

-- CreateIndex
CREATE INDEX "Report_targetProductMessageId_idx" ON "Report"("targetProductMessageId");

-- CreateIndex
CREATE INDEX "Report_targetStreamMessageId_idx" ON "Report"("targetStreamMessageId");
