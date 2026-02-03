/**
 * File Name : features/user/actions/product.ts
 * Description : 유저 관련 제품 조회 Controller (프로필 내 제품 목록)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.20  임도헌   Created   API Route 대체용 Server Action(기존: etchInitialUserProducts.client.ts,app/api/user-products/initial/route.ts)
 * 2026.01.24  임도헌   Moved     app/(tabs)/profile/(product)/actions.ts에서 이동
 */
"use server";

import {
  getInitialUserProducts,
  getMoreUserProducts,
  type UserProductsScope,
} from "@/features/product/service/userList";
import type { Paginated } from "@/features/product/types";

/**
 * 유저 제품 목록 조회 Action (초기/추가 로드 통합)
 *
 * - 프로필 탭 전환 시 클라이언트에서 호출합니다.
 * - cursor가 있으면 추가 로드(무한 스크롤), 없으면 초기 로드(캐싱)를 수행합니다.
 * - Service 계층으로 분기하여 처리합니다.
 */
export async function fetchUserProductsAction<T = any>(
  scope: UserProductsScope,
  cursor?: number | null
): Promise<Paginated<T>> {
  if (cursor) {
    // 추가 로드 (비캐시)
    return await getMoreUserProducts(scope, cursor);
  }
  // 초기 로드 (캐시)
  return await getInitialUserProducts(scope);
}
