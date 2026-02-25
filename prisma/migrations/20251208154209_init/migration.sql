-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "phone" TEXT,
    "github_id" TEXT,
    "avatar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_badge_check" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "payload" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "SMSToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" SERIAL NOT NULL,
    "followerId" INTEGER NOT NULL,
    "followingId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "reservation_at" TIMESTAMP(3),
    "reservation_userId" INTEGER,
    "purchase_userId" INTEGER,
    "purchased_at" TIMESTAMP(3),
    "game_type" TEXT NOT NULL,
    "min_players" INTEGER NOT NULL,
    "max_players" INTEGER NOT NULL,
    "play_time" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "completeness" TEXT NOT NULL,
    "has_manual" BOOLEAN NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "eng_name" TEXT NOT NULL,
    "kor_name" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "parentId" INTEGER,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "productId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductLike" (
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,

    CONSTRAINT "ProductLike_pkey" PRIMARY KEY ("userId","productId")
);

-- CreateTable
CREATE TABLE "ProductChatRoom" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "productId" INTEGER NOT NULL,

    CONSTRAINT "ProductChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMessage" (
    "id" SERIAL NOT NULL,
    "payload" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "productChatRoomId" TEXT,

    CONSTRAINT "ProductMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostImage" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "postId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostLike" (
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,

    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "PostTag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" SERIAL NOT NULL,
    "payload" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "image" TEXT,
    "type" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPushSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_used" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreferences" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "chat" BOOLEAN NOT NULL DEFAULT true,
    "trade" BOOLEAN NOT NULL DEFAULT true,
    "review" BOOLEAN NOT NULL DEFAULT true,
    "badge" BOOLEAN NOT NULL DEFAULT true,
    "system" BOOLEAN NOT NULL DEFAULT true,
    "stream" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,

    CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "keyword" TEXT NOT NULL,
    "category" TEXT,
    "minPrice" INTEGER,
    "maxPrice" INTEGER,
    "game_type" TEXT,
    "condition" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchTag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopularSearch" (
    "id" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PopularSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveInput" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider_uid" TEXT NOT NULL,
    "stream_key" TEXT NOT NULL,
    "name" TEXT,
    "deleteAfterDays" INTEGER,
    "requireSignedURLs" BOOLEAN NOT NULL DEFAULT false,
    "hideLiveViewerCount" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" SERIAL NOT NULL,
    "liveInputId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "password" TEXT,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "streamCategoryId" INTEGER,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VodAsset" (
    "id" SERIAL NOT NULL,
    "broadcastId" INTEGER NOT NULL,
    "provider_asset_id" TEXT NOT NULL,
    "playback_hls" TEXT,
    "playback_dash" TEXT,
    "thumbnail_url" TEXT,
    "duration_sec" INTEGER,
    "ready_at" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VodAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamTag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreamTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamCategory" (
    "id" SERIAL NOT NULL,
    "eng_name" TEXT NOT NULL,
    "kor_name" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "parentId" INTEGER,

    CONSTRAINT "StreamCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamChatRoom" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "broadcastId" INTEGER NOT NULL,

    CONSTRAINT "StreamChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamMessage" (
    "id" SERIAL NOT NULL,
    "payload" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "streamChatRoomId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "StreamMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordingLike" (
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "vodId" INTEGER NOT NULL,

    CONSTRAINT "RecordingLike_pkey" PRIMARY KEY ("userId","vodId")
);

-- CreateTable
CREATE TABLE "RecordingComment" (
    "id" SERIAL NOT NULL,
    "payload" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "vodId" INTEGER NOT NULL,

    CONSTRAINT "RecordingComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BadgeToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_BadgeToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProductToSearchTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProductToSearchTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProductChatRoomToUser" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProductChatRoomToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PostToPostTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_PostToPostTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_BroadcastTags" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_BroadcastTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_github_id_key" ON "User"("github_id");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_name_key" ON "Badge"("name");

-- CreateIndex
CREATE INDEX "Review_productId_idx" ON "Review"("productId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "Review_rate_idx" ON "Review"("rate");

-- CreateIndex
CREATE INDEX "Review_created_at_idx" ON "Review"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "SMSToken_token_key" ON "SMSToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "SMSToken_phone_key" ON "SMSToken"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "EmailToken_token_key" ON "EmailToken"("token");

-- CreateIndex
CREATE INDEX "EmailToken_userId_idx" ON "EmailToken"("userId");

-- CreateIndex
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE INDEX "Follow_followerId_id_idx" ON "Follow"("followerId", "id");

-- CreateIndex
CREATE INDEX "Follow_followingId_id_idx" ON "Follow"("followingId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "Product_title_idx" ON "Product"("title");

-- CreateIndex
CREATE INDEX "Product_created_at_idx" ON "Product"("created_at");

-- CreateIndex
CREATE INDEX "Product_price_idx" ON "Product"("price");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Post_category_idx" ON "Post"("category");

-- CreateIndex
CREATE INDEX "Post_created_at_idx" ON "Post"("created_at");

-- CreateIndex
CREATE INDEX "Post_userId_idx" ON "Post"("userId");

-- CreateIndex
CREATE INDEX "Post_title_idx" ON "Post"("title");

-- CreateIndex
CREATE UNIQUE INDEX "PostTag_name_key" ON "PostTag"("name");

-- CreateIndex
CREATE INDEX "PostTag_name_idx" ON "PostTag"("name");

-- CreateIndex
CREATE INDEX "PostTag_count_idx" ON "PostTag"("count");

-- CreateIndex
CREATE INDEX "Notification_userId_created_at_idx" ON "Notification"("userId", "created_at");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "PushSubscription_isActive_idx" ON "PushSubscription"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_userId_key" ON "PushSubscription"("endpoint", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_userId_key" ON "NotificationPreferences"("userId");

-- CreateIndex
CREATE INDEX "SearchHistory_userId_idx" ON "SearchHistory"("userId");

-- CreateIndex
CREATE INDEX "SearchHistory_keyword_idx" ON "SearchHistory"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "SearchTag_name_key" ON "SearchTag"("name");

-- CreateIndex
CREATE INDEX "SearchTag_name_idx" ON "SearchTag"("name");

-- CreateIndex
CREATE INDEX "SearchTag_count_idx" ON "SearchTag"("count");

-- CreateIndex
CREATE UNIQUE INDEX "PopularSearch_keyword_key" ON "PopularSearch"("keyword");

-- CreateIndex
CREATE INDEX "PopularSearch_count_idx" ON "PopularSearch"("count" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "LiveInput_provider_uid_key" ON "LiveInput"("provider_uid");

-- CreateIndex
CREATE INDEX "LiveInput_userId_idx" ON "LiveInput"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveInput_userId_key" ON "LiveInput"("userId");

-- CreateIndex
CREATE INDEX "Broadcast_liveInputId_idx" ON "Broadcast"("liveInputId");

-- CreateIndex
CREATE INDEX "Broadcast_status_idx" ON "Broadcast"("status");

-- CreateIndex
CREATE INDEX "Broadcast_started_at_idx" ON "Broadcast"("started_at");

-- CreateIndex
CREATE INDEX "Broadcast_streamCategoryId_idx" ON "Broadcast"("streamCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "VodAsset_provider_asset_id_key" ON "VodAsset"("provider_asset_id");

-- CreateIndex
CREATE INDEX "VodAsset_broadcastId_idx" ON "VodAsset"("broadcastId");

-- CreateIndex
CREATE INDEX "VodAsset_ready_at_idx" ON "VodAsset"("ready_at");

-- CreateIndex
CREATE INDEX "VodAsset_views_idx" ON "VodAsset"("views");

-- CreateIndex
CREATE UNIQUE INDEX "StreamTag_name_key" ON "StreamTag"("name");

-- CreateIndex
CREATE INDEX "StreamTag_name_idx" ON "StreamTag"("name");

-- CreateIndex
CREATE INDEX "StreamCategory_parentId_idx" ON "StreamCategory"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "StreamChatRoom_broadcastId_key" ON "StreamChatRoom"("broadcastId");

-- CreateIndex
CREATE INDEX "StreamMessage_userId_streamChatRoomId_created_at_idx" ON "StreamMessage"("userId", "streamChatRoomId", "created_at");

-- CreateIndex
CREATE INDEX "StreamMessage_streamChatRoomId_created_at_idx" ON "StreamMessage"("streamChatRoomId", "created_at");

-- CreateIndex
CREATE INDEX "RecordingComment_vodId_created_at_idx" ON "RecordingComment"("vodId", "created_at");

-- CreateIndex
CREATE INDEX "_BadgeToUser_B_index" ON "_BadgeToUser"("B");

-- CreateIndex
CREATE INDEX "_ProductToSearchTag_B_index" ON "_ProductToSearchTag"("B");

-- CreateIndex
CREATE INDEX "_ProductChatRoomToUser_B_index" ON "_ProductChatRoomToUser"("B");

-- CreateIndex
CREATE INDEX "_PostToPostTag_B_index" ON "_PostToPostTag"("B");

-- CreateIndex
CREATE INDEX "_BroadcastTags_B_index" ON "_BroadcastTags"("B");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSToken" ADD CONSTRAINT "SMSToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_reservation_userId_fkey" FOREIGN KEY ("reservation_userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_purchase_userId_fkey" FOREIGN KEY ("purchase_userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLike" ADD CONSTRAINT "ProductLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLike" ADD CONSTRAINT "ProductLike_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductChatRoom" ADD CONSTRAINT "ProductChatRoom_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMessage" ADD CONSTRAINT "ProductMessage_productChatRoomId_fkey" FOREIGN KEY ("productChatRoomId") REFERENCES "ProductChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMessage" ADD CONSTRAINT "ProductMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostImage" ADD CONSTRAINT "PostImage_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveInput" ADD CONSTRAINT "LiveInput_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_liveInputId_fkey" FOREIGN KEY ("liveInputId") REFERENCES "LiveInput"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_streamCategoryId_fkey" FOREIGN KEY ("streamCategoryId") REFERENCES "StreamCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VodAsset" ADD CONSTRAINT "VodAsset_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamCategory" ADD CONSTRAINT "StreamCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "StreamCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamChatRoom" ADD CONSTRAINT "StreamChatRoom_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamMessage" ADD CONSTRAINT "StreamMessage_streamChatRoomId_fkey" FOREIGN KEY ("streamChatRoomId") REFERENCES "StreamChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamMessage" ADD CONSTRAINT "StreamMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordingLike" ADD CONSTRAINT "RecordingLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordingLike" ADD CONSTRAINT "RecordingLike_vodId_fkey" FOREIGN KEY ("vodId") REFERENCES "VodAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordingComment" ADD CONSTRAINT "RecordingComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordingComment" ADD CONSTRAINT "RecordingComment_vodId_fkey" FOREIGN KEY ("vodId") REFERENCES "VodAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BadgeToUser" ADD CONSTRAINT "_BadgeToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BadgeToUser" ADD CONSTRAINT "_BadgeToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToSearchTag" ADD CONSTRAINT "_ProductToSearchTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToSearchTag" ADD CONSTRAINT "_ProductToSearchTag_B_fkey" FOREIGN KEY ("B") REFERENCES "SearchTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductChatRoomToUser" ADD CONSTRAINT "_ProductChatRoomToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "ProductChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductChatRoomToUser" ADD CONSTRAINT "_ProductChatRoomToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostToPostTag" ADD CONSTRAINT "_PostToPostTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostToPostTag" ADD CONSTRAINT "_PostToPostTag_B_fkey" FOREIGN KEY ("B") REFERENCES "PostTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BroadcastTags" ADD CONSTRAINT "_BroadcastTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BroadcastTags" ADD CONSTRAINT "_BroadcastTags_B_fkey" FOREIGN KEY ("B") REFERENCES "StreamTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
