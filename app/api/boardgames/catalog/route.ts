/**
 * File Name : app/api/boardgames/catalog/route.ts
 * Description : 공개 보드게임 도감 목록 조회 API
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.18  임도헌   Created   Client queryFn에서 조회용 Server Action을 직접 호출하지 않도록 도감 목록 조회 API 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { BOARDGAME_CATALOG_PAGE_SIZE } from "@/features/boardgame/constants";
import { getPublishedBoardGames } from "@/features/boardgame/service/publicQuery/list";
import { parseBoardGameCatalogFilters } from "@/features/boardgame/utils/catalogFilters";

/**
 * 공개 보드게임 도감 목록 반환
 * Client Component queryFn은 이 Route Handler를 fetch해 Server Action 초기 렌더 호출 오류를 피하도록 구성
 *
 * @param request - page, limit, q, players, playTime, weight, sort query를 포함한 요청
 * @returns 공개 도감 목록 응답 또는 에러 응답
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawPage = Number(searchParams.get("page"));
  const rawLimit = Number(searchParams.get("limit"));
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.floor(rawLimit))
    : BOARDGAME_CATALOG_PAGE_SIZE;
  const filters = parseBoardGameCatalogFilters({
    q: searchParams.get("q") ?? undefined,
    players: searchParams.get("players") ?? undefined,
    playTime: searchParams.get("playTime") ?? undefined,
    weight: searchParams.get("weight") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
  });

  const result = await getPublishedBoardGames(page, limit, filters);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result.data);
}
