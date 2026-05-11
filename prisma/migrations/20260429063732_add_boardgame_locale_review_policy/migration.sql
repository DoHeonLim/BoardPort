/*
  Warnings:

  - A unique constraint covering the columns `[type,slug]` on the table `BoardGameTaxonomy` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "BoardGameTaxonomy_type_slug_idx";

-- CreateIndex
CREATE INDEX "BoardGameLocale_reviewedById_idx" ON "BoardGameLocale"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "BoardGameTaxonomy_type_slug_key" ON "BoardGameTaxonomy"("type", "slug");

-- AddForeignKey
ALTER TABLE "BoardGameLocale" ADD CONSTRAINT "BoardGameLocale_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
