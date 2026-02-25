-- DropIndex
DROP INDEX "Product_categoryId_idx";

-- DropIndex
DROP INDEX "Product_created_at_idx";

-- DropIndex
DROP INDEX "Product_purchase_userId_id_idx";

-- DropIndex
DROP INDEX "Product_title_idx";

-- DropIndex
DROP INDEX "Product_userId_id_idx";

-- CreateIndex
CREATE INDEX "Product_created_at_idx" ON "Product"("created_at" DESC);

-- CreateIndex
CREATE INDEX "Product_game_type_idx" ON "Product"("game_type");

-- CreateIndex
CREATE INDEX "Product_condition_idx" ON "Product"("condition");

-- CreateIndex
CREATE INDEX "Product_userId_created_at_idx" ON "Product"("userId", "created_at" DESC);

-- CreateIndex
CREATE INDEX "Product_categoryId_created_at_idx" ON "Product"("categoryId", "created_at" DESC);
