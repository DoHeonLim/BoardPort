-- 신고 대상이 삭제된 뒤에도 관리자 처리·감사 화면에서 당시 대상을 식별하기 위한 스냅샷
ALTER TABLE "Report"
ADD COLUMN "targetPreview" TEXT,
ADD COLUMN "targetOwnerId" INTEGER,
ADD COLUMN "targetOwnerUsername" TEXT,
ADD COLUMN "targetParentId" INTEGER,
ADD COLUMN "targetParentPreview" TEXT;

-- 기존 신고는 현재 남아 있는 원본을 기준으로 표시 정보 보강
UPDATE "Report" AS r
SET
  "targetPreview" = CASE
    WHEN r."targetUserId" IS NOT NULL THEN (
      SELECT u."username" FROM "User" AS u WHERE u."id" = r."targetUserId"
    )
    WHEN r."targetProductId" IS NOT NULL THEN (
      SELECT p."title" FROM "Product" AS p WHERE p."id" = r."targetProductId"
    )
    WHEN r."targetPostId" IS NOT NULL THEN (
      SELECT p."title" FROM "Post" AS p WHERE p."id" = r."targetPostId"
    )
    WHEN r."targetCommentId" IS NOT NULL THEN (
      SELECT c."payload" FROM "Comment" AS c WHERE c."id" = r."targetCommentId"
    )
    WHEN r."targetStreamId" IS NOT NULL THEN (
      SELECT b."title" FROM "Broadcast" AS b WHERE b."id" = r."targetStreamId"
    )
    WHEN r."targetProductMessageId" IS NOT NULL THEN (
      SELECT COALESCE(pm."payload", '이미지 메시지')
      FROM "ProductMessage" AS pm
      WHERE pm."id" = r."targetProductMessageId"
    )
    WHEN r."targetStreamMessageId" IS NOT NULL THEN (
      SELECT sm."payload" FROM "StreamMessage" AS sm WHERE sm."id" = r."targetStreamMessageId"
    )
    WHEN r."targetReviewId" IS NOT NULL THEN (
      SELECT rv."payload" FROM "Review" AS rv WHERE rv."id" = r."targetReviewId"
    )
    ELSE NULL
  END,
  "targetOwnerId" = CASE
    WHEN r."targetUserId" IS NOT NULL THEN r."targetUserId"
    WHEN r."targetProductId" IS NOT NULL THEN (
      SELECT p."userId" FROM "Product" AS p WHERE p."id" = r."targetProductId"
    )
    WHEN r."targetPostId" IS NOT NULL THEN (
      SELECT p."userId" FROM "Post" AS p WHERE p."id" = r."targetPostId"
    )
    WHEN r."targetCommentId" IS NOT NULL THEN (
      SELECT c."userId" FROM "Comment" AS c WHERE c."id" = r."targetCommentId"
    )
    WHEN r."targetStreamId" IS NOT NULL THEN (
      SELECT li."userId"
      FROM "Broadcast" AS b
      JOIN "LiveInput" AS li ON li."id" = b."liveInputId"
      WHERE b."id" = r."targetStreamId"
    )
    WHEN r."targetProductMessageId" IS NOT NULL THEN (
      SELECT pm."userId" FROM "ProductMessage" AS pm WHERE pm."id" = r."targetProductMessageId"
    )
    WHEN r."targetStreamMessageId" IS NOT NULL THEN (
      SELECT sm."userId" FROM "StreamMessage" AS sm WHERE sm."id" = r."targetStreamMessageId"
    )
    WHEN r."targetReviewId" IS NOT NULL THEN (
      SELECT rv."userId" FROM "Review" AS rv WHERE rv."id" = r."targetReviewId"
    )
    ELSE NULL
  END,
  "targetParentId" = CASE
    WHEN r."targetCommentId" IS NOT NULL THEN (
      SELECT c."postId" FROM "Comment" AS c WHERE c."id" = r."targetCommentId"
    )
    WHEN r."targetProductMessageId" IS NOT NULL THEN (
      SELECT pcr."productId"
      FROM "ProductMessage" AS pm
      JOIN "ProductChatRoom" AS pcr ON pcr."id" = pm."productChatRoomId"
      WHERE pm."id" = r."targetProductMessageId"
    )
    WHEN r."targetStreamMessageId" IS NOT NULL THEN (
      SELECT scr."broadcastId"
      FROM "StreamMessage" AS sm
      JOIN "StreamChatRoom" AS scr ON scr."id" = sm."streamChatRoomId"
      WHERE sm."id" = r."targetStreamMessageId"
    )
    WHEN r."targetReviewId" IS NOT NULL THEN (
      SELECT rv."productId" FROM "Review" AS rv WHERE rv."id" = r."targetReviewId"
    )
    ELSE NULL
  END;

UPDATE "Report" AS r
SET "targetOwnerUsername" = u."username"
FROM "User" AS u
WHERE u."id" = r."targetOwnerId";

UPDATE "Report" AS r
SET "targetParentPreview" = CASE
  WHEN r."targetCommentId" IS NOT NULL THEN (
    SELECT p."title" FROM "Post" AS p WHERE p."id" = r."targetParentId"
  )
  WHEN r."targetProductMessageId" IS NOT NULL OR r."targetReviewId" IS NOT NULL THEN (
    SELECT p."title" FROM "Product" AS p WHERE p."id" = r."targetParentId"
  )
  WHEN r."targetStreamMessageId" IS NOT NULL THEN (
    SELECT b."title" FROM "Broadcast" AS b WHERE b."id" = r."targetParentId"
  )
  ELSE NULL
END;

-- 목록과 검색에 과도한 원문이 남지 않도록 기존 장문 요약 제한
UPDATE "Report"
SET
  "targetPreview" = LEFT(REGEXP_REPLACE(TRIM("targetPreview"), '\s+', ' ', 'g'), 240),
  "targetParentPreview" = LEFT(REGEXP_REPLACE(TRIM("targetParentPreview"), '\s+', ' ', 'g'), 240)
WHERE "targetPreview" IS NOT NULL OR "targetParentPreview" IS NOT NULL;
