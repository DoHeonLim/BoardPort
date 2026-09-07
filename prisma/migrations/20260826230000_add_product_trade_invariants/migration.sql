-- File Name : prisma/migrations/20260826230000_add_product_trade_invariants/migration.sql
-- Description : 상품 예약·구매 상태의 단일 상대방과 ID·시각 불변식 보장
-- Author : 임도헌
--
-- History
-- Date        Author   Status    Description
-- 2026.08.26  임도헌   Created   legacy 상태 정규화, 거래 상대 배타·판매자 제외 CHECK 추가

-- 구매 완료 정보가 있으면 이를 최종 상태로 간주하고 남은 예약 정보를 제거한다.
UPDATE "Product"
SET
  "reservation_userId" = NULL,
  "reservation_at" = NULL
WHERE "purchase_userId" IS NOT NULL;

-- 판매자 본인을 거래 상대방으로 기록한 legacy 상태는 판매중으로 되돌린다.
UPDATE "Product"
SET
  "reservation_userId" = NULL,
  "reservation_at" = NULL
WHERE "reservation_userId" = "userId";

UPDATE "Product"
SET
  "purchase_userId" = NULL,
  "purchased_at" = NULL
WHERE "purchase_userId" = "userId";

-- 상대방이 존재하는 legacy 행에 시각이 없으면 마지막 수정 시각으로 보완한다.
UPDATE "Product"
SET "reservation_at" = COALESCE("updated_at", "created_at", CURRENT_TIMESTAMP)
WHERE "reservation_userId" IS NOT NULL
  AND "reservation_at" IS NULL;

UPDATE "Product"
SET "purchased_at" = COALESCE("updated_at", "created_at", CURRENT_TIMESTAMP)
WHERE "purchase_userId" IS NOT NULL
  AND "purchased_at" IS NULL;

-- 상대방 없이 시각만 남은 legacy 행을 판매중 상태로 정규화한다.
UPDATE "Product"
SET "reservation_at" = NULL
WHERE "reservation_userId" IS NULL;

UPDATE "Product"
SET "purchased_at" = NULL
WHERE "purchase_userId" IS NULL;

-- User 삭제의 ON DELETE SET NULL이 ID만 비우더라도 대응 시각까지 함께 정리한다.
CREATE OR REPLACE FUNCTION "boardport_normalize_product_trade_state"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."reservation_userId" IS NULL THEN
    NEW."reservation_at" := NULL;
  END IF;

  IF NEW."purchase_userId" IS NULL THEN
    NEW."purchased_at" := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "Product_normalize_trade_state_trigger" ON "Product";

CREATE TRIGGER "Product_normalize_trade_state_trigger"
BEFORE INSERT OR UPDATE OF
  "reservation_userId",
  "reservation_at",
  "purchase_userId",
  "purchased_at"
ON "Product"
FOR EACH ROW
EXECUTE FUNCTION "boardport_normalize_product_trade_state"();

ALTER TABLE "Product"
DROP CONSTRAINT IF EXISTS "Product_trade_party_exclusive_check",
DROP CONSTRAINT IF EXISTS "Product_reservation_pair_check",
DROP CONSTRAINT IF EXISTS "Product_purchase_pair_check",
DROP CONSTRAINT IF EXISTS "Product_seller_not_trade_party_check";

ALTER TABLE "Product"
ADD CONSTRAINT "Product_trade_party_exclusive_check"
CHECK (
  "reservation_userId" IS NULL
  OR "purchase_userId" IS NULL
),
ADD CONSTRAINT "Product_reservation_pair_check"
CHECK (
  ("reservation_userId" IS NULL) = ("reservation_at" IS NULL)
),
ADD CONSTRAINT "Product_purchase_pair_check"
CHECK (
  ("purchase_userId" IS NULL) = ("purchased_at" IS NULL)
),
ADD CONSTRAINT "Product_seller_not_trade_party_check"
CHECK (
  ("reservation_userId" IS NULL OR "reservation_userId" <> "userId")
  AND ("purchase_userId" IS NULL OR "purchase_userId" <> "userId")
);
