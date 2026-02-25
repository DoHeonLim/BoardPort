/*
  Warnings:

  - A unique constraint covering the columns `[kakao_id]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "kakao_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_kakao_id_key" ON "User"("kakao_id");
