-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'APPOINTMENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELED');

-- AlterTable
ALTER TABLE "ProductMessage" ADD COLUMN     "appointmentId" INTEGER,
ADD COLUMN     "type" "MessageType" NOT NULL DEFAULT 'TEXT';

-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "meetDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "chatRoomId" TEXT NOT NULL,
    "proposerId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Appointment_chatRoomId_idx" ON "Appointment"("chatRoomId");

-- CreateIndex
CREATE INDEX "Appointment_proposerId_idx" ON "Appointment"("proposerId");

-- CreateIndex
CREATE INDEX "Appointment_receiverId_idx" ON "Appointment"("receiverId");

-- AddForeignKey
ALTER TABLE "ProductMessage" ADD CONSTRAINT "ProductMessage_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ProductChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
