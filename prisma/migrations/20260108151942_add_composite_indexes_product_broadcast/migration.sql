-- DropIndex
DROP INDEX "Broadcast_liveInputId_idx";

-- DropIndex
DROP INDEX "Broadcast_status_idx";

-- CreateIndex
CREATE INDEX "Broadcast_liveInputId_id_idx" ON "Broadcast"("liveInputId", "id");

-- CreateIndex
CREATE INDEX "Broadcast_status_id_idx" ON "Broadcast"("status", "id");

-- CreateIndex
CREATE INDEX "Product_userId_id_idx" ON "Product"("userId", "id");

-- CreateIndex
CREATE INDEX "Product_purchase_userId_id_idx" ON "Product"("purchase_userId", "id");
