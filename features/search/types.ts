/**
 * File Name : features/search/types.ts
 * Description : 검색 도메인 공용 타입 정의
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.02  임도헌   Created   검색 기록/필터/지역 검색 공용 타입 분리
 */

/** 검색 기록 아이템 */
export interface SearchHistoryItem {
  keyword: string;
  created_at: Date;
}

/** 인기 검색어 아이템 */
export interface PopularSearchItem {
  keyword: string;
  count: number;
}

/** 검색 필터 키 */
export type SearchFilterKey =
  | "category"
  | "minPrice"
  | "maxPrice"
  | "game_type"
  | "condition";

/** 검색 필터 값 맵 */
export type SearchFilterValues = Partial<Record<SearchFilterKey, string>>;

/** 제품 검색 빠른 분류 파라미터 키 */
export type ProductQuickCategoryParamKey = "category" | "game_type";

/** 제품 검색용 카테고리 옵션 */
export interface ProductSearchCategoryOption {
  id: number;
  kor_name: string;
  eng_name: string;
  icon: string | null;
  parentId: number | null;
}

/** 카카오 장소 검색 결과 최소 타입 */
export interface RegionSearchResultItem {
  place_name: string;
  address_name: string;
}
