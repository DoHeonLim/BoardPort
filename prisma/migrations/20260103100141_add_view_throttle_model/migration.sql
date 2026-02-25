-- CreateEnum
CREATE TYPE "ViewTargetType" AS ENUM ('POST', 'PRODUCT', 'VOD');

-- CreateTable
CREATE TABLE "ViewThrottle" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "targetType" "ViewTargetType" NOT NULL,
    "targetId" INTEGER NOT NULL,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewThrottle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ViewThrottle_targetType_targetId_idx" ON "ViewThrottle"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ViewThrottle_userId_idx" ON "ViewThrottle"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ViewThrottle_userId_targetType_targetId_key" ON "ViewThrottle"("userId", "targetType", "targetId");

-- AddForeignKey
ALTER TABLE "ViewThrottle" ADD CONSTRAINT "ViewThrottle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
