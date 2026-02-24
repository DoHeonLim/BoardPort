-- CreateEnum
CREATE TYPE "RegionRange" AS ENUM ('DONG', 'GU', 'CITY', 'ALL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "regionRange" "RegionRange" NOT NULL DEFAULT 'GU';
