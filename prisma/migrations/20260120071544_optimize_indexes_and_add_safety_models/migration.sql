-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'INAPPROPRIATE', 'ABUSIVE', 'SCAM', 'OTHER');

-- DropIndex
DROP INDEX "Follow_followerId_idx";

-- DropIndex
DROP INDEX "Follow_followingId_idx";

-- DropIndex
DROP INDEX "Notification_isRead_idx";

-- DropIndex
DROP INDEX "Post_category_idx";

-- DropIndex
DROP INDEX "Post_userId_idx";

-- DropIndex
DROP INDEX "PushSubscription_isActive_idx";

-- DropIndex
DROP INDEX "PushSubscription_userId_idx";

-- DropIndex
DROP INDEX "Review_created_at_idx";

-- DropIndex
DROP INDEX "Review_productId_idx";

-- DropIndex
DROP INDEX "Review_userId_idx";

-- DropIndex
DROP INDEX "SearchHistory_userId_idx";

-- DropIndex
DROP INDEX "StreamMessage_userId_streamChatRoomId_created_at_idx";

-- CreateTable
CREATE TABLE "Block" (
    "id" SERIAL NOT NULL,
    "blockerId" INTEGER NOT NULL,
    "blockedId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "targetUserId" INTEGER,
    "targetProductId" INTEGER,
    "targetPostId" INTEGER,
    "targetCommentId" INTEGER,
    "targetStreamId" INTEGER,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Block_blockerId_idx" ON "Block"("blockerId");

-- CreateIndex
CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "Block"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Comment_postId_created_at_idx" ON "Comment"("postId", "created_at");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Post_category_created_at_idx" ON "Post"("category", "created_at");

-- CreateIndex
CREATE INDEX "Post_userId_created_at_idx" ON "Post"("userId", "created_at");

-- CreateIndex
CREATE INDEX "PostImage_postId_idx" ON "PostImage"("postId");

-- CreateIndex
CREATE INDEX "ProductChatRoom_updated_at_idx" ON "ProductChatRoom"("updated_at");

-- CreateIndex
CREATE INDEX "ProductChatRoom_productId_idx" ON "ProductChatRoom"("productId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "ProductMessage_productChatRoomId_created_at_idx" ON "ProductMessage"("productChatRoomId", "created_at");

-- CreateIndex
CREATE INDEX "ProductMessage_productChatRoomId_isRead_userId_idx" ON "ProductMessage"("productChatRoomId", "isRead", "userId");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_isActive_idx" ON "PushSubscription"("userId", "isActive");

-- CreateIndex
CREATE INDEX "Review_productId_created_at_idx" ON "Review"("productId", "created_at");

-- CreateIndex
CREATE INDEX "Review_userId_created_at_idx" ON "Review"("userId", "created_at");

-- CreateIndex
CREATE INDEX "SearchHistory_userId_updated_at_idx" ON "SearchHistory"("userId", "updated_at");

-- CreateIndex
CREATE INDEX "StreamMessage_userId_idx" ON "StreamMessage"("userId");

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
