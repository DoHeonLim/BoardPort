/*
  Warnings:

  - Changed the type of `visibility` on the `Broadcast` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "StreamVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');

-- AlterTable
ALTER TABLE "Broadcast" DROP COLUMN "visibility",
ADD COLUMN     "visibility" "StreamVisibility" NOT NULL;
