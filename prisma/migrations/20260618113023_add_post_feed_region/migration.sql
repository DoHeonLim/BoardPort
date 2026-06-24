-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "feedRegion1" TEXT,
ADD COLUMN     "feedRegion2" TEXT,
ADD COLUMN     "feedRegion3" TEXT;

-- CreateIndex
CREATE INDEX "Post_feedRegion1_feedRegion2_idx" ON "Post"("feedRegion1", "feedRegion2");
