-- AlterEnum
ALTER TYPE "MediaAssetPurpose" ADD VALUE 'VOD_THUMBNAIL';

-- AlterTable
ALTER TABLE "VodAsset"
ADD COLUMN "title" TEXT,
ADD COLUMN "custom_thumbnail_url" TEXT,
ADD COLUMN "thumbnailAnimated" BOOLEAN NOT NULL DEFAULT false;
