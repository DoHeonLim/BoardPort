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
 * 2026.03.04  임도헌   Modified  unstable_cache 래퍼 및 파편화된 페이징 로직 제거, 단일 함수(getUserProductsList)로 통합
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

import "server-only";
import db from "@/lib/db";
import { PRODUCTS_PAGE_TAKE } from "@/lib/constants";
import { PROFILE_SALES_UNIFIED_SELECT } from "@/features/product/constants";
import type {
  Paginated,
  TabCounts,
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
 * 사용자별 맞춤 제품 목록 조회 및 페이징 로직
 *
 * [데이터 페칭 및 가공 전략]
 * - 프로필 내 판매 내역 / 구매 내역 탭을 위한 커서 기반 무한 스크롤 데이터 추출
 * - 주입된 `scope` 타입(SELLING, RESERVED, SOLD, PURCHASED)에 따른 동적 Where 조건 분기 적용
 * - 삭제 엣지 케이스 방어를 위한 커서 유효성 사전 검사(SELECT id) 수행
 * - 단일 통합 쿼리 셀렉터(`PROFILE_SALES_UNIFIED_SELECT`) 적용을 통한 필드 정합성 유지
 *
 * @param {UserProductsScope} scope - 조회할 목록 타입 및 대상 유저 ID
 * @param {number | null} [cursor] - 페이징 커서 (제품 ID)
 * @returns {Promise<Paginated<T>>} 페이징된 목록 및 커서 반환
 */
export async function getUserProductsList<
  T = MySalesListItem | MyPurchasedListItem,
>(scope: UserProductsScope, cursor?: number | null): Promise<Paginated<T>> {
  let cursorOpt: Record<string, any> = {};

  // 커서 유효성 검사 (삭제된 제품일 수 있으므로 확인)
  if (cursor) {
    const exists = await db.product.findUnique({
      where: { id: cursor },
      select: { id: true },
    });
    if (exists) cursorOpt = { skip: 1, cursor: { id: cursor } };
  }

  const rows = await db.product.findMany({
    where: whereFor(scope),
    select: PROFILE_SALES_UNIFIED_SELECT,
    orderBy: { id: "desc" },
    take: TAKE + 1,
    ...cursorOpt,
  });

  const hasNext = rows.length > TAKE;
  const products = (hasNext ? rows.slice(0, TAKE) : rows) as unknown as T[];
  const nextCursor = hasNext
    ? (products[products.length - 1] as any)!.id
    : null;

  return { products, nextCursor };
}

/**
 * 사용자 판매/예약 상태별 누적 상품 카운트 집계 로직
 *
 * [데이터 가공 전략]
 * - 특정 사용자가 등록한 상품의 거래 상태(판매 중, 예약 중, 판매 완료)별 레코드 수 병렬(Promise.all) 조회
 * - 마이페이지 탭 전환 버튼의 상태 뱃지 렌더링 값으로 활용
 *
 * @param {number} userId - 카운트를 조회할 대상 유저 ID
 * @returns {Promise<TabCounts>} 상태별 누적 개수 객체 반환
 */
export async function getUserTabCounts(userId: number): Promise<TabCounts> {
  const [selling, reserved, sold] = await Promise.all([
    db.product.count({
      where: { userId, purchase_userId: null, reservation_userId: null },
    }),
    db.product.count({
      where: {
        userId,
        purchase_userId: null,
        reservation_userId: { not: null },
      },
    }),
    db.product.count({
      where: { userId, purchase_userId: { not: null } },
    }),
  ]);
  return { selling, reserved, sold };
}
