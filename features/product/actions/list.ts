/**
 * File Name : features/product/actions/list.ts
 * Description : 제품 목록 조회 Controller (무한 스크롤)
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
 */

"use server";

import { getMoreProducts as fetchMore } from "@/features/product/service/list";
import type { Paginated, ProductType } from "@/features/product/types";

/**
 * 무한 스크롤용 추가 데이터 로드 Action
 * - 클라이언트 컴포넌트(`ProductList`)에서 다음 페이지 요청 시 호출됩니다.
 *
 * @param {number | null} cursor - 마지막 아이템 ID
 * @returns {Promise<Paginated<ProductType>>} 다음 페이지 데이터
 */
export const getMoreProducts = async (
  cursor: number | null
): Promise<Paginated<ProductType>> => {
  return fetchMore(cursor);
};
