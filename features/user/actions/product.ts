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
 */
"use server";

import {
  getUserProductsList,
  type UserProductsScope,
} from "@/features/product/service/userList";
import type { Paginated } from "@/features/product/types";

/**
 * 유저 제품 목록 조회 Server Action
 *
 * [데이터 페칭 및 권한 제어]
 * - 요청 유저 정보 기반 Service 계층의 제품 목록 조회 호출
 * - 페이징 처리된 데이터(Paginated) 객체 반환
 *
 * @param {UserProductsScope} scope - 판매/예약/구매 등 제품 범위 설정
 * @param {number | null} [cursor] - 페이지네이션 커서
 */
export async function getUserProductsAction<T = any>(
  scope: UserProductsScope,
  cursor: number | null = null
): Promise<Paginated<T>> {
  return await getUserProductsList<T>(scope, cursor);
}
