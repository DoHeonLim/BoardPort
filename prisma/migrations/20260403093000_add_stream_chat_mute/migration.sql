CREATE TABLE "StreamChatMute" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "broadcastId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "mutedById" INTEGER NOT NULL,

    CONSTRAINT "StreamChatMute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StreamChatMute_broadcastId_userId_key" ON "StreamChatMute"("broadcastId", "userId");
CREATE INDEX "StreamChatMute_broadcastId_created_at_idx" ON "StreamChatMute"("broadcastId", "created_at");
CREATE INDEX "StreamChatMute_userId_idx" ON "StreamChatMute"("userId");
CREATE INDEX "StreamChatMute_mutedById_idx" ON "StreamChatMute"("mutedById");

ALTER TABLE "StreamChatMute"
ADD CONSTRAINT "StreamChatMute_broadcastId_fkey"
FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StreamChatMute"
ADD CONSTRAINT "StreamChatMute_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StreamChatMute"
ADD CONSTRAINT "StreamChatMute_mutedById_fkey"
FOREIGN KEY ("mutedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
