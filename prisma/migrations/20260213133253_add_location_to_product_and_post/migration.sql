-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "locationName" TEXT,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "region1" TEXT,
ADD COLUMN     "region2" TEXT,
ADD COLUMN     "region3" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "locationName" TEXT,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "region1" TEXT,
ADD COLUMN     "region2" TEXT,
ADD COLUMN     "region3" TEXT;

-- CreateIndex
CREATE INDEX "Post_latitude_longitude_idx" ON "Post"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Post_region1_region2_idx" ON "Post"("region1", "region2");

-- CreateIndex
CREATE INDEX "Product_latitude_longitude_idx" ON "Product"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Product_region1_region2_idx" ON "Product"("region1", "region2");
