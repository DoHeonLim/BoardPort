/**
 * File Name : features/product/lib/getUserProducts.ts
 * Description : 프로필/마이페이지 공용 제품 목록(초기/무한스크롤)
 *
 * History
 * Date        Author   Status     Description
 * 2024.12.07  임도헌   Created    app/(tabs)/profile/[username]/actions에 getUserProducts / getMoreUserProducts 최초 추가
 * 2024.12.12  임도헌   Modified   대표 이미지 1장만 선택(images where order=0, take=1)
 * 2024.12.22  임도헌   Modified   제품 스키마 변경에 따른 select 필드 정리
 * 2025.05.23  임도헌   Modified   판매완료 판별을 purchase_userId null 여부로 통합
 * 2025.10.08  임도헌   Moved      lib/product/getUserProducts로 분리(server-only) + ProductStatus 타입 도입
 * 2025.10.17  임도헌   Modified   Scope별로 구분할 수 있도록 변경
 * 2025.10.23  임도헌   Modified   조건 필드 통일(reservation_userId/purchase_userId), id DESC 커서 정합화, 초기 nextCursor 계산, per-id 태그 캐시 추가
 * 2025.11.02  임도헌   Modified   캐시 키 스코프화(충돌/디버깅 개선), 커서 존재 검증(삭제 엣지 방어), 주석으로 key/tag 전략 명확화
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 */

"use server";

import "server-only";
import { unstable_cache as nextCache } from "next/cache";
import db from "@/lib/db";
import * as T from "@/lib/cacheTags";
import { PRODUCTS_PAGE_TAKE } from "@/lib/constants";
import { PROFILE_SALES_UNIFIED_SELECT } from "@/features/product/lib/constants";
import type { Paginated } from "@/types/product";

const TAKE = PRODUCTS_PAGE_TAKE;

/** 스코프: 전부 id 기준으로 통일 */
export type UserProductsScope =
  | { type: "SELLING"; userId: number } // 내가 판 것(판매 중)
  | { type: "RESERVED"; userId: number } // 내가 판 것(예약 중)
  | { type: "SOLD"; userId: number } // 내가 판 것(판매 완료)
  | { type: "PURCHASED"; userId: number }; // 내가 산 것

/**
 * 태그 네이밍 규격(정밀 무효화 편의)
 * - revalidateTag(...) 호출 시 사용
 * - 태그는 "무효화 범위"를 지정하는 레이블
 */
function tagForScope(scope: UserProductsScope) {
  return T.USER_PRODUCTS_SCOPE_ID(scope.type, scope.userId);
}

/**
 * 캐시 키 식별자(스코프 포함)
 * - key는 "캐시 엔트리 식별" 용도
 * - 같은 태그라도 key를 스코프별로 나누면 충돌/오염을 줄이고 디버깅이 쉬워짐
 */
function scopeKey(s: UserProductsScope) {
  return `${s.type}-uid-${s.userId}`; // 예: SELLING-uid-42
}

/** where 조건 — 필드 기준을 reservation_userId / purchase_userId 로 통일 */
function whereFor(scope: UserProductsScope) {
  switch (scope.type) {
    case "SELLING":
      return {
        userId: scope.userId,
        reservation_userId: null,
        purchase_userId: null,
      };
    case "RESERVED":
      return {
        userId: scope.userId,
        reservation_userId: { not: null },
        purchase_userId: null,
      };
    case "SOLD":
      return {
        userId: scope.userId,
        purchase_userId: { not: null },
      };
    case "PURCHASED":
      return {
        purchase_userId: scope.userId,
      };
  }
}

/**
 * 공통 쿼리(fetchProducts)
 *
 * 정렬/커서 규칙:
 * - orderBy: { id: "desc" }  // 정렬 기준과 커서 컬럼을 통일해야 안정적인 커서 페이징
 * - take: TAKE+1             // 다음 페이지 유무 판단(초과분 1개를 잘라내고 마지막 id를 nextCursor로)
 *
 * 커서 엣지(삭제 등) 방어:
 * - 요청 시점에 cursor id가 삭제되었을 수 있으므로 사전 존재 검증
 * - 존재하지 않으면 cursor 옵션을 생략하여 "현재 시점 다음 페이지"를 유연하게 생성
 *
 * 반환 타입:
 * - { products, nextCursor } 형태로 Paginated 응답
 */
async function fetchProducts<T = any>(
  scope: UserProductsScope,
  take: number,
  cursor?: number | null
): Promise<Paginated<T>> {
  let cursorOpt: Record<string, any> = {};
  if (cursor) {
    const exists = await db.product.findUnique({
      where: { id: cursor },
      select: { id: true },
    });
    if (exists) {
      cursorOpt = { skip: 1, cursor: { id: cursor } };
    }
    // 존재하지 않으면 cursorOpt 생략 → 안전하게 다음 페이지 구성
  }

  const rows = await db.product.findMany({
    where: whereFor(scope),
    select: PROFILE_SALES_UNIFIED_SELECT,
    orderBy: { id: "desc" }, // 커서와 정렬 기준을 id로 통일
    take: take + 1, // TAKE+1로 다음 페이지 유무 판단
    ...cursorOpt,
  });

  const hasNext = rows.length > take;
  const products = (hasNext ? rows.slice(0, take) : rows) as unknown as T[];
  const nextCursor = hasNext
    ? (products[products.length - 1] as any)!.id
    : null;

  return { products, nextCursor };
}

/**
 * 초기: per-id 태그 캐시 + scope별 key로 식별 + nextCursor 계산
 *
 * key vs tag:
 * - key   : 캐시 "식별자" (동일 key → 동일 엔트리 공유)
 * - tags  : revalidateTag(...)로 "무효화 범위"를 지정하는 레이블
 *
 * 전략:
 * - key에 scope(SELLING/RESERVED/SOLD/PURCHASED + userId)를 포함해 충돌/오염 방지
 * - tag는 기존처럼 per-id로 유지하여 정밀 무효화
 */

export async function getCachedInitialUserProducts(
  scope: UserProductsScope
): Promise<Paginated<any>> {
  const tag = tagForScope(scope);
  const cached = nextCache(
    async (s: UserProductsScope, take: number) => fetchProducts(s, take),
    // key에 스코프를 포함하여 엔트리 식별을 명확히 한다.
    [`user-products-initial-${scopeKey(scope)}`],
    { tags: [tag] }
  );
  return cached(scope, TAKE);
}

/** 초기(비캐시 버전이 필요하면 이것 사용) */
export async function getInitialUserProducts(
  scope: UserProductsScope
): Promise<Paginated<any>> {
  return fetchProducts(scope, TAKE);
}

/**
 * 더 불러오기(스크롤) — 일반적으로 비캐시
 * - 프론트 훅(useProductPagination)에서 같은 cursor 재요청 방지(중복로드 방지)
 */
export async function getMoreUserProducts(
  scope: UserProductsScope,
  cursor: number | null
): Promise<Paginated<any>> {
  return fetchProducts(scope, TAKE, cursor);
}

/**
 * 유저 탭별 총 제품 개수 — per-id 태그 캐시
 * - 판매자용 SELLING/RESERVED/SOLD 개수
 * - 구매자 측 카운트가 별도로 필요하다면 PURCHSED 전용 API/태그를 추가로 둘 것
 */
export async function getCachedUserTabCounts(userId: number) {
  const cached = nextCache(
    async (uid: number) => {
      const [selling, reserved, sold] = await Promise.all([
        db.product.count({
          where: {
            userId: uid,
            purchase_userId: null,
            reservation_userId: null,
          },
        }),
        db.product.count({
          where: {
            userId: uid,
            purchase_userId: null,
            reservation_userId: { not: null },
          },
        }),
        db.product.count({
          where: { userId: uid, purchase_userId: { not: null } },
        }),
      ]);
      return { selling, reserved, sold };
    },
    // counts는 userId 단일 스코프이므로 key도 per-id로 명시
    [`user-products-tab-counts-id-${userId}`],
    { tags: [T.USER_PRODUCTS_COUNTS_ID(userId)] }
  );
  return cached(userId);
}

/**
 * 변경 이벤트 무효화 예시:
 *
 *  - 상태 변경(SELLING ↔ RESERVED ↔ SOLD), 구매/예약/해제 등:
 *    revalidateTag(`user-products-SELLING-id-${sellerId}`);
 *    revalidateTag(`user-products-RESERVED-id-${sellerId}`);
 *    revalidateTag(`user-products-SOLD-id-${sellerId}`);
 *    revalidateTag(`user-products-counts-id-${sellerId}`);
 *
 *  - 내가 구매(PURCHASED) 탭에 영향 줄 때(판매완료 성립/롤백 등):
 *    revalidateTag(`user-products-PURCHASED-id-${buyerId}`);
 *
 * 주의:
 * - key는 "엔트리 식별" 용도이며, 무효화는 항상 tag를 통해 수행한다.
 * - key를 스코프화하면 충돌/오염을 줄이고, 디버깅 시 어떤 요청 스코프의 엔트리인지 파악이 쉽다.
 */
