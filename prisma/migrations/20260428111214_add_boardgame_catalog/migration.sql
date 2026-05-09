-- CreateEnum
CREATE TYPE "BoardGameLocaleStatus" AS ENUM ('DRAFT', 'REVIEWED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BoardGameLocaleSource" AS ENUM ('BGG_METADATA', 'AI_ASSISTED', 'ADMIN', 'USER_SUGGESTED');

-- CreateEnum
CREATE TYPE "BoardGameTaxonomyType" AS ENUM ('CATEGORY', 'MECHANIC');

-- CreateTable
CREATE TABLE "BoardGame" (
    "id" SERIAL NOT NULL,
    "bggId" INTEGER NOT NULL,
    "primaryName" TEXT NOT NULL,
    "bggUrl" TEXT NOT NULL,
    "yearPublished" INTEGER,
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "minPlayTime" INTEGER,
    "maxPlayTime" INTEGER,
    "playingTime" INTEGER,
    "minAge" INTEGER,
    "weightAverage" DOUBLE PRECISION,
    "bggRating" DOUBLE PRECISION,
    "bggRank" INTEGER,
    "imageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardGameLocale" (
    "id" SERIAL NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ko',
    "title" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "shortDescription" TEXT,
    "searchKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "BoardGameLocaleStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "BoardGameLocaleSource" NOT NULL DEFAULT 'ADMIN',
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "boardGameId" INTEGER NOT NULL,

    CONSTRAINT "BoardGameLocale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardGameTaxonomy" (
    "id" SERIAL NOT NULL,
    "type" "BoardGameTaxonomyType" NOT NULL,
    "bggId" INTEGER,
    "bggName" TEXT NOT NULL,
    "koName" TEXT,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardGameTaxonomy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductBoardGame" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "boardGameId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBoardGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostBoardGame" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "boardGameId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostBoardGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamBoardGame" (
    "id" SERIAL NOT NULL,
    "broadcastId" INTEGER NOT NULL,
    "boardGameId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamBoardGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BoardGameCategories" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_BoardGameCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_BoardGameMechanics" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_BoardGameMechanics_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoardGame_bggId_key" ON "BoardGame"("bggId");

-- CreateIndex
CREATE INDEX "BoardGame_primaryName_idx" ON "BoardGame"("primaryName");

-- CreateIndex
CREATE INDEX "BoardGame_yearPublished_idx" ON "BoardGame"("yearPublished");

-- CreateIndex
CREATE INDEX "BoardGame_minPlayers_maxPlayers_idx" ON "BoardGame"("minPlayers", "maxPlayers");

-- CreateIndex
CREATE INDEX "BoardGame_playingTime_idx" ON "BoardGame"("playingTime");

-- CreateIndex
CREATE INDEX "BoardGame_weightAverage_idx" ON "BoardGame"("weightAverage");

-- CreateIndex
CREATE INDEX "BoardGame_bggRank_idx" ON "BoardGame"("bggRank");

-- CreateIndex
CREATE INDEX "BoardGameLocale_locale_status_idx" ON "BoardGameLocale"("locale", "status");

-- CreateIndex
CREATE INDEX "BoardGameLocale_title_idx" ON "BoardGameLocale"("title");

-- CreateIndex
CREATE UNIQUE INDEX "BoardGameLocale_boardGameId_locale_key" ON "BoardGameLocale"("boardGameId", "locale");

-- CreateIndex
CREATE INDEX "BoardGameTaxonomy_type_slug_idx" ON "BoardGameTaxonomy"("type", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "BoardGameTaxonomy_type_bggName_key" ON "BoardGameTaxonomy"("type", "bggName");

-- CreateIndex
CREATE INDEX "ProductBoardGame_boardGameId_idx" ON "ProductBoardGame"("boardGameId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBoardGame_productId_boardGameId_key" ON "ProductBoardGame"("productId", "boardGameId");

-- CreateIndex
CREATE INDEX "PostBoardGame_boardGameId_idx" ON "PostBoardGame"("boardGameId");

-- CreateIndex
CREATE UNIQUE INDEX "PostBoardGame_postId_boardGameId_key" ON "PostBoardGame"("postId", "boardGameId");

-- CreateIndex
CREATE INDEX "StreamBoardGame_boardGameId_idx" ON "StreamBoardGame"("boardGameId");

-- CreateIndex
CREATE UNIQUE INDEX "StreamBoardGame_broadcastId_boardGameId_key" ON "StreamBoardGame"("broadcastId", "boardGameId");

-- CreateIndex
CREATE INDEX "_BoardGameCategories_B_index" ON "_BoardGameCategories"("B");

-- CreateIndex
CREATE INDEX "_BoardGameMechanics_B_index" ON "_BoardGameMechanics"("B");

-- AddForeignKey
ALTER TABLE "BoardGameLocale" ADD CONSTRAINT "BoardGameLocale_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "BoardGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBoardGame" ADD CONSTRAINT "ProductBoardGame_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBoardGame" ADD CONSTRAINT "ProductBoardGame_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "BoardGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostBoardGame" ADD CONSTRAINT "PostBoardGame_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostBoardGame" ADD CONSTRAINT "PostBoardGame_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "BoardGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamBoardGame" ADD CONSTRAINT "StreamBoardGame_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamBoardGame" ADD CONSTRAINT "StreamBoardGame_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "BoardGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BoardGameCategories" ADD CONSTRAINT "_BoardGameCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "BoardGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BoardGameCategories" ADD CONSTRAINT "_BoardGameCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "BoardGameTaxonomy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BoardGameMechanics" ADD CONSTRAINT "_BoardGameMechanics_A_fkey" FOREIGN KEY ("A") REFERENCES "BoardGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BoardGameMechanics" ADD CONSTRAINT "_BoardGameMechanics_B_fkey" FOREIGN KEY ("B") REFERENCES "BoardGameTaxonomy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
