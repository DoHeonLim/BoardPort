-- Report processing uses a transient PROCESSING claim inside the same transaction.
ALTER TABLE "Report"
ADD CONSTRAINT "Report_status_check"
CHECK ("status" IN ('PENDING', 'PROCESSING', 'RESOLVED', 'DISMISSED'));

-- A completed report action can be retried without repeating strikes or content deletion.
ALTER TABLE "AuditLog" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "AuditLog_idempotencyKey_key"
ON "AuditLog"("idempotencyKey");

ALTER TABLE "Notification" ADD COLUMN "deliveryKey" TEXT;
CREATE UNIQUE INDEX "Notification_deliveryKey_key"
ON "Notification"("deliveryKey");

-- External effects are persisted with the moderation transaction and dispatched after commit.
CREATE TABLE "ModerationOutbox" (
    "id" SERIAL NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "lastError" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationOutbox_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ModerationOutbox_status_check"
      CHECK ("status" IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    CONSTRAINT "ModerationOutbox_attempts_check" CHECK ("attempts" >= 0)
);

CREATE UNIQUE INDEX "ModerationOutbox_dedupeKey_key"
ON "ModerationOutbox"("dedupeKey");
CREATE INDEX "ModerationOutbox_status_available_at_idx"
ON "ModerationOutbox"("status", "available_at");
