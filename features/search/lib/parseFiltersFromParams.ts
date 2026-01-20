/**
 * File Name : features/search/lib/parseFiltersFromParams.ts
 * Description : URL 쿼리 → 검색 필터 상태 변환 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   URL 파라미터 → FilterState 변환 함수 생성
 * 2026.01.19  임도헌   Moved     lib/search -> features/search/lib
 */

import { FilterState } from "@/lib/constants";

interface RawSearchParams {
  [key: string]: string | undefined;
}

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
