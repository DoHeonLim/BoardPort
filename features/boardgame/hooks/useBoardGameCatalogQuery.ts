/**
 * File Name : features/boardgame/hooks/useBoardGameCatalogQuery.ts
 * Description : 보드게임 도감 목록 TanStack Query 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.08  임도헌   Created   page/filter 기반 공개 도감 목록 Suspense Query 추가
 */

"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { getBoardGamesCatalogAction } from "@/features/boardgame/actions/list";
import { queryKeys } from "@/lib/queryKeys";
import type { BoardGameCatalogFilters } from "@/features/boardgame/types/catalog";
import type { BoardGamePublicListResponse } from "@/features/boardgame/types/public";

interface UseBoardGameCatalogQueryParams {
  page: number;
  limit: number;
  filters: BoardGameCatalogFilters;
}

/**
 * 공개 보드게임 도감 목록 캐시 조회
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
    queryFn: () => getBoardGamesCatalogAction(page, limit, filters),
  });

  return data;
}
