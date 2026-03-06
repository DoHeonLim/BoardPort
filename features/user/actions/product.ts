/**
 * File Name : features/user/actions/product.ts
 * Description : 유저 관련 제품 조회 Controller (프로필 내 제품 목록)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.20  임도헌   Created   API Route 대체용 Server Action(기존: etchInitialUserProducts.client.ts,app/api/user-products/initial/route.ts)
 * 2026.01.24  임도헌   Moved     app/(tabs)/profile/(product)/actions.ts에서 이동
 * 2026.03.04  임도헌   Modified  getUserProductsList 통합 호출 구조 적용
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.06  임도헌   Modified  PURCHASED/LIKED/RESERVED 스코프 접근 권한 검증 추가
 */
"use server";

import getSession from "@/lib/session";
import {
  getUserProductsList,
  type UserProductsScope,
} from "@/features/product/service/userList";
import type {
  Paginated,
  MySalesListItem,
  MyPurchasedListItem,
  ProductType,
} from "@/features/product/types";
import { USER_ERRORS } from "@/features/user/constants";

/**
 * 유저 제품 목록 조회 Server Action
 *
 * [데이터 페칭 및 권한 제어]
 * - 요청받은 스코프(UserProductsScope) 기반으로 Service 계층의 제품 목록 조회 함수를 호출
 * - 커서 기반 페이지네이션(cursor) 파라미터를 전달하여 다음 페이지 데이터 추출
 * - 개인 스코프(PURCHASED/LIKED/RESERVED)는 세션 사용자와 scope.userId 일치 여부를 검증
 * - 반환 타입 기본값을 `MySalesListItem | MyPurchasedListItem | ProductType`으로 통일해
 *   SELLING/RESERVED/SOLD/PURCHASED/LIKED 전 스코프 타입 추론 정합성 확보
 *
 * @template T - 반환할 제품 아이템 타입
 *   (기본값: MySalesListItem | MyPurchasedListItem | ProductType)
 * @param {UserProductsScope} scope - 판매/예약/구매/찜 등 제품 목록 범위 및 대상 유저 정보
 * @param {number | null} [cursor=null] - 커서 기반 페이지네이션 기준 ID
 * @returns {Promise<Paginated<T>>} 제품 목록과 다음 커서 정보
 */
export async function getUserProductsAction<
  T = MySalesListItem | MyPurchasedListItem | ProductType,
>(
  scope: UserProductsScope,
  cursor: number | null = null
): Promise<Paginated<T>> {
  const session = await getSession();
  const viewerId = session?.id ?? null;

  // 개인 데이터 성격이 강한 스코프는 본인만 조회 가능
  const isPrivateScope =
    scope.type === "PURCHASED" ||
    scope.type === "LIKED" ||
    scope.type === "RESERVED";

  if (isPrivateScope && viewerId !== scope.userId) {
    throw new Error(USER_ERRORS.UNAUTHORIZED);
  }

  return await getUserProductsList<T>(scope, cursor);
}
