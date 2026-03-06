-- CreateIndex
CREATE INDEX "Notification_userId_type_link_created_at_idx" ON "Notification"("userId", "type", "link", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ProductLike_productId_idx" ON "ProductLike"("productId");

-- CreateIndex
CREATE INDEX "ProductLike_userId_created_at_productId_idx" ON "ProductLike"("userId", "created_at" DESC, "productId" DESC);
