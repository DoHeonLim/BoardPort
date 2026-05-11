/**
 * File Name : features/boardgame/types/catalog.ts
 * Description : 공개 보드게임 카탈로그 필터 타입
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   카탈로그 검색/정렬 필터 타입 분리
 */

export type BoardGamePlayerFilter = "solo" | "two" | "threeFour" | "group";
export type BoardGameTimeFilter = "short" | "standard" | "long";
export type BoardGameWeightFilter = "light" | "medium" | "heavy";
export type BoardGameSortOption = "rank" | "rating" | "popular" | "newest";

export interface BoardGameCatalogFilters {
  query?: string;
  players?: BoardGamePlayerFilter;
  playTime?: BoardGameTimeFilter;
  weight?: BoardGameWeightFilter;
  sort?: BoardGameSortOption;
}
