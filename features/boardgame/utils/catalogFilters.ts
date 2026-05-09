/**
 * File Name : features/boardgame/utils/catalogFilters.ts
 * Description : 공개 보드게임 카탈로그 URL 필터 helper
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   목록 페이지에서 사용하던 필터 파싱과 링크 생성 helper 분리
 */

import type {
  BoardGameCatalogFilters,
  BoardGamePlayerFilter,
  BoardGameSortOption,
  BoardGameTimeFilter,
  BoardGameWeightFilter,
} from "@/features/boardgame/types/catalog";

/**
 * URL query 값을 공개 카탈로그 필터 타입으로 정규화
 *
 * @param searchParams - 보드게임 목록 URL query
 * @returns 허용된 값만 남긴 카탈로그 필터
 */
export function parseBoardGameCatalogFilters(searchParams: {
  q?: string;
  players?: string;
  playTime?: string;
  weight?: string;
  sort?: string;
}): BoardGameCatalogFilters {
  return {
    query: searchParams.q?.trim() || undefined,
    players: parseFilterValue<BoardGamePlayerFilter>(searchParams.players, [
      "solo",
      "two",
      "threeFour",
      "group",
    ]),
    playTime: parseFilterValue<BoardGameTimeFilter>(searchParams.playTime, [
      "short",
      "standard",
      "long",
    ]),
    weight: parseFilterValue<BoardGameWeightFilter>(searchParams.weight, [
      "light",
      "medium",
      "heavy",
    ]),
    sort:
      parseFilterValue<BoardGameSortOption>(searchParams.sort, [
        "rank",
        "rating",
        "popular",
        "newest",
      ]) ?? "rank",
  };
}

/**
 * 현재 필터를 유지한 카탈로그 페이지 링크 생성
 *
 * @param page - 이동할 페이지 번호
 * @param filters - 현재 적용된 카탈로그 필터
 * @returns 보드게임 목록 URL
 */
export function buildBoardGameListHref(
  page: number,
  filters: BoardGameCatalogFilters
): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (filters.query) params.set("q", filters.query);
  if (filters.players) params.set("players", filters.players);
  if (filters.playTime) params.set("playTime", filters.playTime);
  if (filters.weight) params.set("weight", filters.weight);
  if (filters.sort && filters.sort !== "rank") {
    params.set("sort", filters.sort);
  }

  const queryString = params.toString();
  return queryString ? `/boardgames?${queryString}` : "/boardgames";
}

/**
 * URL query 값이 허용된 필터 값인지 확인
 *
 * @param value - URL에서 읽은 raw 값
 * @param allowedValues - 허용된 필터 값 목록
 * @returns 허용된 값이면 그대로 반환하고, 아니면 undefined
 */
function parseFilterValue<T extends string>(
  value: string | undefined,
  allowedValues: T[]
): T | undefined {
  return allowedValues.includes(value as T) ? (value as T) : undefined;
}
