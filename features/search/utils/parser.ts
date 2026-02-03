/**
 * File Name : features/search/utils/parser.ts
 * Description : URL 쿼리 파라미터 파싱 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   URL 파라미터 → FilterState 변환 함수 생성
 * 2026.01.19  임도헌   Moved     lib/search -> features/search/lib
 * 2026.01.24  임도헌   Moved     lib/parseFiltersFromParams -> utils/parser
 * 2026.01.28  임도헌   Modified  주석 보강 및 FilterState Import 수정
 */

import { FilterState } from "@/features/product/types";

interface RawSearchParams {
  [key: string]: string | undefined;
}

/**
 * URL 쿼리 파라미터 객체를 `FilterState` 타입으로 변환합니다.
 * undefined 값은 빈 문자열로 처리하여 폼 상태와 동기화하기 쉽게 만듭니다.
 *
 * @param {RawSearchParams} searchParams - Next.js Page의 searchParams
 * @returns {FilterState} 필터 상태 객체
 */
export function parseFiltersFromParams(
  searchParams: RawSearchParams
): FilterState {
  return {
    category: searchParams.category ?? "",
    minPrice: searchParams.minPrice ?? "",
    maxPrice: searchParams.maxPrice ?? "",
    game_type: searchParams.game_type ?? "",
    condition: searchParams.condition ?? "",
  };
}
