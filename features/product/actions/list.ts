/**
 * File Name : features/product/actions/list.ts
 * Description : 제품 목록 조회 서버 액션 (무한 스크롤)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.29  임도헌   Created
 * 2025.05.29  임도헌   Modified  app/(tabs)/products/actions.ts 파일을 기능별로 분리
 * 2025.05.29  임도헌   Modified  초기 제품 로딩 기능 분리
 * 2025.05.29  임도헌   Modified  무한 스크롤 기능 분리
 * 2025.09.02  임도헌   Modified  TAKE 상수 PRODUCTS_PAGE_TAKE로 변경
 * 2025.11.05  임도헌   Modified  초기 로딩도 TAKE+1로 페이징 판단 + 정렬/커서 id 기준으로 통일
 * 2026.01.08  임도헌   Modified  초기 로딩에 unstable_cache + PRODUCT_LIST 태그 적용
 * 2026.01.20  임도헌   Modified  Service(read.service) 연동
 * 2026.01.22  임도헌   Modified  init 제거 (Service 직접 호출로 변경)
 * 2026.01.27  임도헌   Modified  주석 설명 보강
 * 2026.01.30  임도헌   Moved     app/(tabs)/products/actions/init.ts -> features/product/actions/list.ts
 * 2026.02.05  임도헌   Modified  제품 목록 조회 시 viewerId 전달 (차단 필터링)
 * 2026.03.04  임도헌   Modified  getProductsList로 조회 로직 통합 및 캐시 래퍼 제거
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.11  임도헌   Modified  클라이언트가 전체 검색 결과 수를 표시할 수 있도록 totalCount 응답 전달
 * 2026.03.31  임도헌   Modified  무한 스크롤 조회와 viewer 필터 주석 톤 통일
 * 2026.04.02  임도헌   Modified  목록 액션 JSDoc 반환 설명 보강
 */

"use server";

import getSession from "@/lib/session";
import { getProductsList } from "@/features/product/service/list";
import type {
  Paginated,
  ProductType,
  ProductSearchParams,
} from "@/features/product/types";

/**
 * 제품 목록 조회 Server Action (무한 스크롤 및 필터링)
 *
 * [기능]
 * - 클라이언트 무한 스크롤의 데이터 페칭 진입점 역할
 * - 로그인 세션 기준 viewerId를 주입해 차단/정지 유저 필터링을 함께 적용
 * - 현재 검색 조건(params)을 그대로 유지한 채 service 계층에 위임
 *
 * @param {number | null} cursor - 마지막 아이템 ID 커서
 * @param {ProductSearchParams} params - 검색 파라미터 (keyword, region, category 등)
 * @returns {Promise<Paginated<ProductType>>} 페이징된 제품 목록과 다음 커서/전체 개수
 */
export const getProductsAction = async (
  cursor: number | null,
  params: ProductSearchParams
): Promise<Paginated<ProductType>> => {
  const session = await getSession();
  const viewerId = session?.id ?? -1; // 비로그인 시 -1 (필터링 없음)

  return getProductsList(params, viewerId, cursor);
};
