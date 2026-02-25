-- AlterTable
ALTER TABLE "NotificationPreferences" ADD COLUMN     "keyword" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "KeywordAlert" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "keyword" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KeywordAlert_keyword_idx" ON "KeywordAlert"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "KeywordAlert_userId_keyword_key" ON "KeywordAlert"("userId", "keyword");

-- AddForeignKey
ALTER TABLE "KeywordAlert" ADD CONSTRAINT "KeywordAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
