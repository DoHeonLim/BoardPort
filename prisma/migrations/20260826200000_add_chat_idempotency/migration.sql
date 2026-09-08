-- Add explicit buyer ownership and client request identity without breaking legacy rows.
-- IF NOT EXISTS keeps a failed production attempt safely retryable after Prisma resolve --rolled-back.
ALTER TABLE "ProductChatRoom" ADD COLUMN IF NOT EXISTS "buyerId" INTEGER;
ALTER TABLE "ProductMessage" ADD COLUMN IF NOT EXISTS "clientMessageId" TEXT;

-- Resolve the non-seller participant from current membership first, then preserved history.
UPDATE "ProductChatRoom" AS room
SET "buyerId" = COALESCE(
  (
    SELECT min(membership."B")
    FROM "_ProductChatRoomToUser" AS membership
    WHERE membership."A" = room."id"
      AND membership."B" <> product."userId"
  ),
  (
    SELECT min(message."userId")
    FROM "ProductMessage" AS message
    WHERE message."productChatRoomId" = room."id"
      AND message."userId" <> product."userId"
  ),
  (
    SELECT min(candidate."userId")
    FROM (
      SELECT appointment."proposerId" AS "userId"
      FROM "Appointment" AS appointment
      WHERE appointment."chatRoomId" = room."id"
      UNION ALL
      SELECT appointment."receiverId" AS "userId"
      FROM "Appointment" AS appointment
      WHERE appointment."chatRoomId" = room."id"
    ) AS candidate
    WHERE candidate."userId" <> product."userId"
  )
)
FROM "Product" AS product
WHERE product."id" = room."productId";

-- 참여자·메시지·약속 어디에도 구매 문의자 흔적이 없는 빈 legacy 방은 복원할 수 없으므로 정리한다.
DELETE FROM "Notification" AS notification
USING "ProductChatRoom" AS room
WHERE room."buyerId" IS NULL
  AND (
    notification."link" = '/chats/' || room."id"
    OR notification."link" LIKE '/chats/' || room."id" || '?%'
  );

DELETE FROM "ProductChatRoom"
WHERE "buyerId" IS NULL;

-- Prisma/Supabase can commit individual statements, so use a durable staging table instead of
-- an ON COMMIT DROP temp table and remove it explicitly after all merge statements finish.
DROP TABLE IF EXISTS "_BoardPortChatRoomMerge";
CREATE TABLE "_BoardPortChatRoomMerge" AS
SELECT "duplicateId", "canonicalId"
FROM (
  SELECT
    room."id" AS "duplicateId",
    first_value(room."id") OVER (
      PARTITION BY room."productId", room."buyerId"
      ORDER BY room."created_at" ASC, room."id" ASC
    ) AS "canonicalId",
    row_number() OVER (
      PARTITION BY room."productId", room."buyerId"
      ORDER BY room."created_at" ASC, room."id" ASC
    ) AS position
  FROM "ProductChatRoom" AS room
) AS ranked
WHERE position > 1;

UPDATE "ProductMessage" AS message
SET "productChatRoomId" = merge."canonicalId"
FROM "_BoardPortChatRoomMerge" AS merge
WHERE message."productChatRoomId" = merge."duplicateId";

UPDATE "Appointment" AS appointment
SET "chatRoomId" = merge."canonicalId"
FROM "_BoardPortChatRoomMerge" AS merge
WHERE appointment."chatRoomId" = merge."duplicateId";

INSERT INTO "_ProductChatRoomToUser" ("A", "B")
SELECT merge."canonicalId", membership."B"
FROM "_ProductChatRoomToUser" AS membership
JOIN "_BoardPortChatRoomMerge" AS merge
  ON merge."duplicateId" = membership."A"
ON CONFLICT ("A", "B") DO NOTHING;

DELETE FROM "_ProductChatRoomToUser" AS membership
USING "_BoardPortChatRoomMerge" AS merge
WHERE membership."A" = merge."duplicateId";

UPDATE "Notification" AS notification
SET "link" = '/chats/' || merge."canonicalId"
  || substring(notification."link" FROM length('/chats/' || merge."duplicateId") + 1)
FROM "_BoardPortChatRoomMerge" AS merge
WHERE notification."link" = '/chats/' || merge."duplicateId"
   OR notification."link" LIKE '/chats/' || merge."duplicateId" || '?%';

DELETE FROM "ProductChatRoom" AS room
USING "_BoardPortChatRoomMerge" AS merge
WHERE room."id" = merge."duplicateId";

DROP TABLE "_BoardPortChatRoomMerge";

ALTER TABLE "ProductChatRoom" ALTER COLUMN "buyerId" SET NOT NULL;
CREATE UNIQUE INDEX "ProductChatRoom_productId_buyerId_key"
ON "ProductChatRoom"("productId", "buyerId");
ALTER TABLE "ProductChatRoom"
ADD CONSTRAINT "ProductChatRoom_buyerId_fkey"
FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ProductMessage_userId_clientMessageId_key"
ON "ProductMessage"("userId", "clientMessageId");

-- Keep only the latest legacy pending proposal in each room before adding the invariant.
WITH ranked_pending AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "chatRoomId"
      ORDER BY "updated_at" DESC, "id" DESC
    ) AS position
  FROM "Appointment"
  WHERE "status" = 'PENDING'
)
UPDATE "Appointment" AS appointment
SET "status" = 'CANCELED', "updated_at" = CURRENT_TIMESTAMP
FROM ranked_pending
WHERE appointment."id" = ranked_pending."id"
  AND ranked_pending.position > 1;

CREATE UNIQUE INDEX "Appointment_chatRoomId_pending_key"
ON "Appointment"("chatRoomId")
WHERE "status" = 'PENDING';
