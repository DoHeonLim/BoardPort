-- AlterTable
ALTER TABLE "ProductMessage" ADD COLUMN     "image" TEXT,
ALTER COLUMN "payload" DROP NOT NULL;
