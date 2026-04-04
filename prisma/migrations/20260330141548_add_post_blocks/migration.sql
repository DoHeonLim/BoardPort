-- CreateEnum
CREATE TYPE "PostBlockType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'EMBED');

-- CreateTable
CREATE TABLE "PostBlock" (
    "id" SERIAL NOT NULL,
    "type" "PostBlockType" NOT NULL,
    "order" INTEGER NOT NULL,
    "textContent" TEXT,
    "embedProvider" TEXT,
    "embedUrl" TEXT,
    "embedTitle" TEXT,
    "embedThumbnailUrl" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "postId" INTEGER NOT NULL,
    "postImageId" INTEGER,
    "postVideoId" INTEGER,

    CONSTRAINT "PostBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostBlock_postImageId_key" ON "PostBlock"("postImageId");

-- CreateIndex
CREATE UNIQUE INDEX "PostBlock_postVideoId_key" ON "PostBlock"("postVideoId");

-- CreateIndex
CREATE INDEX "PostBlock_postId_order_idx" ON "PostBlock"("postId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PostBlock_postId_order_key" ON "PostBlock"("postId", "order");

-- AddForeignKey
ALTER TABLE "PostBlock" ADD CONSTRAINT "PostBlock_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostBlock" ADD CONSTRAINT "PostBlock_postImageId_fkey" FOREIGN KEY ("postImageId") REFERENCES "PostImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostBlock" ADD CONSTRAINT "PostBlock_postVideoId_fkey" FOREIGN KEY ("postVideoId") REFERENCES "PostVideo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
