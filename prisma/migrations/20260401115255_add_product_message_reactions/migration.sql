-- CreateEnum
CREATE TYPE "ProductMessageReactionKey" AS ENUM ('LIKE', 'LOVE', 'LAUGH', 'WOW', 'SAD');

-- CreateTable
CREATE TABLE "ProductMessageReaction" (
    "id" SERIAL NOT NULL,
    "reactionKey" "ProductMessageReactionKey" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "messageId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ProductMessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductMessageReaction_messageId_reactionKey_idx" ON "ProductMessageReaction"("messageId", "reactionKey");

-- CreateIndex
CREATE INDEX "ProductMessageReaction_userId_created_at_idx" ON "ProductMessageReaction"("userId", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMessageReaction_messageId_userId_key" ON "ProductMessageReaction"("messageId", "userId");

-- AddForeignKey
ALTER TABLE "ProductMessageReaction" ADD CONSTRAINT "ProductMessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ProductMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMessageReaction" ADD CONSTRAINT "ProductMessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
