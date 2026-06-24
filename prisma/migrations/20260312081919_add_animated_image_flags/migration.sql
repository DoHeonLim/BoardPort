-- AlterTable
ALTER TABLE "Broadcast" ADD COLUMN     "thumbnailAnimated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PostImage" ADD COLUMN     "isAnimated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "isAnimated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProductMessage" ADD COLUMN     "imageIsAnimated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarAnimated" BOOLEAN NOT NULL DEFAULT false;
