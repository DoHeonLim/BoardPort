/**
 * File Name : features/product/service/UserList.ts
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
 * 2026.01.19  임도헌   Moved      lib/product -> features/product/lib
 * 2026.01.20  임도헌   Moved      lib/getUserProducts -> service/userList
 * 2026.01.20  임도헌   Merged     lib/fetchInitialUserProducts.client.ts 및 API Route 대체
 * 2026.01.25  임도헌   Modified  주석 보강 (Scope 정의, 캐싱 전략 상세 설명)
 */

import "server-only";

import { unstable_cache as nextCache } from "next/cache";
import db from "@/lib/db";
import * as T from "@/lib/cacheTags";
import { PRODUCTS_PAGE_TAKE } from "@/lib/constants";
import { PROFILE_SALES_UNIFIED_SELECT } from "@/features/product/constants";
import type { Paginated, TabCounts } from "@/features/product/types";
import type {
  MySalesListItem,
  MyPurchasedListItem,
} from "@/features/product/types";

const TAKE = PRODUCTS_PAGE_TAKE;

/**
 * 유저 제품 목록 조회 범위 (Scope) 정의
 * - SELLING: 판매 중
 * - RESERVED: 예약 중
 * - SOLD: 판매 완료
 * - PURCHASED: 구매 내역
 */
export type UserProductsScope =
  | { type: "SELLING"; userId: number }
  | { type: "RESERVED"; userId: number }
  | { type: "SOLD"; userId: number }
  | { type: "PURCHASED"; userId: number };

/** 캐시 태그 생성 헬퍼 */
function tagForScope(scope: UserProductsScope) {
  return T.USER_PRODUCTS_SCOPE_ID(scope.type, scope.userId);
}

/** 캐시 키 생성 헬퍼 */
function scopeKey(s: UserProductsScope) {
  return `${s.type}-uid-${s.userId}`;
}

/** Prisma Where Input 생성 헬퍼 */
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
 * 제품 목록 조회 (내부 구현)
 * 커서 기반 페이지네이션을 적용하고, Scope에 따른 조건 분기 처리를 수행
 */
async function fetchProducts<T = MySalesListItem | MyPurchasedListItem>(
  scope: UserProductsScope,
  take: number,
  cursor?: number | null
): Promise<Paginated<T>> {
  let cursorOpt: Record<string, any> = {};

  // 커서 유효성 검사 (삭제된 제품일 수 있으므로 확인)
  if (cursor) {
    const exists = await db.product.findUnique({
      where: { id: cursor },
      select: { id: true },
    });
    if (exists) {
      cursorOpt = { skip: 1, cursor: { id: cursor } };
    }
  }

  const rows = await db.product.findMany({
    where: whereFor(scope),
    select: PROFILE_SALES_UNIFIED_SELECT, // 프로필용 최적화된 Select 필드
    orderBy: { id: "desc" },
    take: take + 1, // 다음 페이지 존재 여부 확인을 위해 +1
    ...cursorOpt,
  });

  const hasNext = rows.length > take;
  const products = (hasNext ? rows.slice(0, take) : rows) as unknown as T[];
  const nextCursor = hasNext
    ? (products[products.length - 1] as any)!.id
    : null;

  return { products, nextCursor };
}

// --- Public Functions ---

/**
 * 초기 유저 제품 목록 조회 (Cached)
 * 프로필 진입 시 초기 1페이지를 빠르게 보여주기 위해 캐싱
 *
 * @param {UserProductsScope} scope - 조회 범위
 * @returns {Promise<Paginated<any>>}
 */
export async function getCachedInitialUserProducts(
  scope: UserProductsScope
): Promise<Paginated<any>> {
  const tag = tagForScope(scope);
  const cached = nextCache(
    async (s: UserProductsScope, take: number) => fetchProducts(s, take),
    [`user-products-initial-${scopeKey(scope)}`],
    { tags: [tag] }
  );
  return cached(scope, TAKE);
}

/**
 * 초기 유저 제품 목록 조회 (Non-Cached)
 * 실시간성이 중요한 경우 사용
 *
 * @param {UserProductsScope} scope - 조회 범위
 * @returns {Promise<Paginated<any>>}
 */
export async function getInitialUserProducts(
  scope: UserProductsScope
): Promise<Paginated<any>> {
  return fetchProducts(scope, TAKE);
}

/**
 * 추가 제품 목록 로드 (무한 스크롤용)
 * 커서 이후의 데이터를 가져옴
 * 캐싱 X.
 *
 * @param {UserProductsScope} scope - 조회 범위
 * @param {number | null} cursor - 마지막 아이템 ID
 * @returns {Promise<Paginated<any>>}
 */
export async function getMoreUserProducts(
  scope: UserProductsScope,
  cursor: number | null
): Promise<Paginated<any>> {
  return fetchProducts(scope, TAKE, cursor);
}

/**
 * 유저 탭별 카운트 조회 (Cached)
 * 판매중/예약중/판매완료 개수를 한 번에 조회하여 캐싱
 *
 * @param {number} userId - 대상 유저 ID
 * @returns {Promise<TabCounts>} 탭별 아이템 개수
 */
export async function getCachedUserTabCounts(
  userId: number
): Promise<TabCounts> {
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
    [`user-products-tab-counts-id-${userId}`],
    { tags: [T.USER_PRODUCTS_COUNTS_ID(userId)] }
  );
  return cached(userId);
}
