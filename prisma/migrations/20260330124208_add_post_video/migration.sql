-- CreateEnum
CREATE TYPE "PostVideoStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "PostVideo" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'CLOUDFLARE_STREAM',
    "providerAssetId" TEXT,
    "uploadUid" TEXT,
    "status" "PostVideoStatus" NOT NULL DEFAULT 'UPLOADING',
    "thumbnailUrl" TEXT,
    "durationSec" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "postId" INTEGER NOT NULL,

    CONSTRAINT "PostVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostVideo_providerAssetId_key" ON "PostVideo"("providerAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "PostVideo_uploadUid_key" ON "PostVideo"("uploadUid");

-- CreateIndex
CREATE UNIQUE INDEX "PostVideo_postId_key" ON "PostVideo"("postId");

-- CreateIndex
CREATE INDEX "PostVideo_postId_idx" ON "PostVideo"("postId");

-- CreateIndex
CREATE INDEX "PostVideo_status_idx" ON "PostVideo"("status");

-- AddForeignKey
ALTER TABLE "PostVideo" ADD CONSTRAINT "PostVideo_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
