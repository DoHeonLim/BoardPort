/**
 * File Name : features/boardgame/hooks/useBoardGameCatalogQuery.ts
 * Description : 보드게임 도감 목록 TanStack Query 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.08  임도헌   Created   page/filter 기반 공개 도감 목록 Suspense Query 추가
 * 2026.05.18  임도헌   Modified  Client queryFn 초기 렌더의 조회용 Server Action 호출을 피하도록 Route Handler fetch로 변경
 */

"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import type { BoardGameCatalogFilters } from "@/features/boardgame/types/catalog";
import type { BoardGamePublicListResponse } from "@/features/boardgame/types/public";

interface UseBoardGameCatalogQueryParams {
  page: number;
  limit: number;
  filters: BoardGameCatalogFilters;
}

/**
 * 보드게임 도감 목록 API URL 생성
 *
 * @param params - 페이지, 페이지 크기, 필터 조건
 * @returns 도감 목록 API URL
 */
function buildBoardGameCatalogApiUrl({
  page,
  limit,
  filters,
}: UseBoardGameCatalogQueryParams) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (filters.query) params.set("q", filters.query);
  if (filters.players) params.set("players", filters.players);
  if (filters.playTime) params.set("playTime", filters.playTime);
  if (filters.weight) params.set("weight", filters.weight);
  if (filters.sort) params.set("sort", filters.sort);

  return `/api/boardgames/catalog?${params.toString()}`;
}

/**
 * 공개 보드게임 도감 목록 API 조회
 * Client Component queryFn에서는 Server Action 직접 호출 대신 HTTP fetch를 사용해 초기 렌더 fetch waterfall 오류를 방지
 *
 * @param params - 페이지, 페이지 크기, 필터 조건
 * @returns 공개 도감 목록 응답
 */
async function fetchBoardGameCatalog(
  params: UseBoardGameCatalogQueryParams
): Promise<BoardGamePublicListResponse> {
  const response = await fetch(buildBoardGameCatalogApiUrl(params), {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("보드게임 도감 목록을 불러오지 못했습니다.");
  }

  return response.json();
}

/**
 * 공개 보드게임 도감 목록 캐시 조회
 * Route Handler fetch를 통해 Client queryFn의 Server Action 직접 호출을 피하는 조회 훅
 *
 * @param params - 페이지, 페이지 크기, URL 기반 필터
 * @returns 공개 도감 목록 응답
 */
export function useBoardGameCatalogQuery({
  page,
  limit,
  filters,
}: UseBoardGameCatalogQueryParams): BoardGamePublicListResponse {
  const { data } = useSuspenseQuery({
    queryKey: queryKeys.boardgames.list({ page, limit, ...filters }),
    queryFn: () => fetchBoardGameCatalog({ page, limit, filters }),
  });

  return data;
}
