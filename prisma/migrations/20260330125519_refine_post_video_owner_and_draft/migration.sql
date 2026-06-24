/*
  Warnings:

  - A unique constraint covering the columns `[draftKey]` on the table `PostVideo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `PostVideo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PostVideo" ADD COLUMN     "draftKey" TEXT,
ADD COLUMN     "userId" INTEGER NOT NULL,
ALTER COLUMN "postId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PostVideo_draftKey_key" ON "PostVideo"("draftKey");

-- CreateIndex
CREATE INDEX "PostVideo_userId_idx" ON "PostVideo"("userId");

-- CreateIndex
CREATE INDEX "PostVideo_draftKey_idx" ON "PostVideo"("draftKey");

-- AddForeignKey
ALTER TABLE "PostVideo" ADD CONSTRAINT "PostVideo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
