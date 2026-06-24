/**
 * File Name : features/boardgame/actions/list.ts
 * Description : 공개 보드게임 도감 목록 Server Action
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.08  임도헌   Created   TanStack Query에서 사용할 공개 도감 목록 액션 추가
 */
"use server";

import { getPublishedBoardGames } from "@/features/boardgame/service/publicQuery/list";
import type { BoardGameCatalogFilters } from "@/features/boardgame/types/catalog";
import type { BoardGamePublicListResponse } from "@/features/boardgame/types/public";

/**
 * 공개 보드게임 도감 목록 조회 액션
 *
 * @param page - 현재 페이지
 * @param limit - 페이지당 항목 수
 * @param filters - 검색/필터/정렬 조건
 * @returns 공개 도감 목록 응답
 */
export async function getBoardGamesCatalogAction(
  page: number,
  limit: number,
  filters: BoardGameCatalogFilters
): Promise<BoardGamePublicListResponse> {
  const result = await getPublishedBoardGames(page, limit, filters);

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.data;
}
