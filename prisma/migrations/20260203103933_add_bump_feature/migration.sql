-- DropIndex
DROP INDEX "Product_categoryId_created_at_idx";

-- DropIndex
DROP INDEX "Product_userId_created_at_idx";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "last_bumped_at" TIMESTAMP(3),
ADD COLUMN     "refreshed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Product_refreshed_at_idx" ON "Product"("refreshed_at" DESC);

-- CreateIndex
CREATE INDEX "Product_userId_refreshed_at_idx" ON "Product"("userId", "refreshed_at" DESC);

-- CreateIndex
CREATE INDEX "Product_categoryId_refreshed_at_idx" ON "Product"("categoryId", "refreshed_at" DESC);
