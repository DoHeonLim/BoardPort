-- AlterTable
ALTER TABLE "BoardGame" ADD COLUMN     "bayesRating" DOUBLE PRECISION,
ADD COLUMN     "bestPlayers" TEXT,
ADD COLUMN     "family" TEXT,
ADD COLUMN     "goodPlayers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "kickstarted" BOOLEAN,
ADD COLUMN     "userRatings" INTEGER;

-- CreateIndex
CREATE INDEX "BoardGame_userRatings_idx" ON "BoardGame"("userRatings");

-- CreateIndex
CREATE INDEX "BoardGame_family_idx" ON "BoardGame"("family");
