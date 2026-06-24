/**
 * File Name : features/boardgame/service/publicQuery/list.ts
 * Description : 공개 보드게임 카탈로그 목록 조회
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.28  임도헌   Created   PUBLISHED 한국어 locale 기준 공개 목록 조회 추가
 * 2026.04.28  임도헌   Modified  인기도/추천 인원/시리즈 메타데이터 조회 추가
 * 2026.04.29  임도헌   Modified  공개 카탈로그 조회 기준 주석 정리
 * 2026.04.29  임도헌   Modified  짧은 설명이 검수된 PUBLISHED locale만 공개하도록 조건 보강
 * 2026.05.02  임도헌   Modified  taxonomy 한국어 표시명 조회 의도 주석 추가
 * 2026.05.03  임도헌   Modified  공개 목록 검색/카드에 taxonomy 정보 반영
 * 2026.05.05  임도헌   Modified  공개 목록 조회와 검색 조건 조립 분리
 */

import "server-only";
import db from "@/lib/db";
import { PUBLISHED_BOARDGAME_LOCALE_WHERE } from "@/features/boardgame/selects";
import {
  getBoardGameFilterConditions,
  getBoardGameOrderBy,
} from "@/features/boardgame/service/publicQuery/filters";
import type { Prisma } from "@/generated/prisma/client";
import type { ServiceResult } from "@/lib/types";
import type { BoardGameCatalogFilters } from "@/features/boardgame/types/catalog";
import type { BoardGamePublicListResponse } from "@/features/boardgame/types/public";

/**
 * 공개 보드게임 목록 조회
 * 관리자 검수를 거쳐 PUBLISHED 상태가 되고 짧은 설명/검수 시각이 채워진 한국어 locale만 노출
 *
 * @param page - 현재 페이지
 * @param limit - 페이지당 항목 수
 * @param filters - 게임명/별칭 검색어와 인원/시간/난이도/정렬 필터
 * @returns {Promise<ServiceResult<BoardGamePublicListResponse>>} 공개 카탈로그 목록
 */
export async function getPublishedBoardGames(
  page = 1,
  limit = 24,
  filters: BoardGameCatalogFilters = {}
): Promise<ServiceResult<BoardGamePublicListResponse>> {
  try {
    const skip = (page - 1) * limit;
    const trimmedQuery = filters.query?.trim();
    const filterConditions = getBoardGameFilterConditions(filters);
    const where: Prisma.BoardGameWhereInput = {
      locales: {
        some: PUBLISHED_BOARDGAME_LOCALE_WHERE,
      },
      ...(trimmedQuery ? { OR: getBoardGameSearchConditions(trimmedQuery) } : {}),
      ...(filterConditions.length ? { AND: filterConditions } : {}),
    };

    const [total, items] = await Promise.all([
      db.boardGame.count({ where }),
      db.boardGame.findMany({
        where,
        select: {
          id: true,
          bggId: true,
          primaryName: true,
          yearPublished: true,
          minPlayers: true,
          maxPlayers: true,
          playingTime: true,
          weightAverage: true,
          bayesRating: true,
          bggRank: true,
          userRatings: true,
          bestPlayers: true,
          goodPlayers: true,
          family: true,
          imageUrl: true,
          categories: {
            select: {
              id: true,
              bggName: true,
              koName: true,
            },
            orderBy: { bggName: "asc" },
            take: 3,
          },
          mechanics: {
            select: {
              id: true,
              bggName: true,
              koName: true,
            },
            orderBy: { bggName: "asc" },
            take: 3,
          },
          locales: {
            where: PUBLISHED_BOARDGAME_LOCALE_WHERE,
            select: {
              title: true,
              aliases: true,
              shortDescription: true,
            },
            take: 1,
          },
        },
        orderBy: getBoardGameOrderBy(filters.sort),
        skip,
        take: limit,
      }),
    ]);

    return {
      success: true,
      data: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        items: items.flatMap(({ locales, ...item }) => {
          const locale = locales[0];
          // 공개 조건은 where에서 보장하지만 select 결과 방어를 위해 locale 없는 항목 제외
          if (!locale) return [];

          return [
            {
              ...item,
              locale,
            },
          ];
        }),
      },
    };
  } catch (error) {
    console.error("[BoardGame Public List Error]", error);
    return {
      success: false,
      error: "보드게임 목록을 불러오지 못했습니다.",
    };
  }
}

/**
 * 검색어의 원제, 한국어 title/alias/keyword, taxonomy 이름 검색 조건 확장
 *
 * @param query - trim 처리된 검색어
 * @returns 공개 목록 검색용 OR 조건 배열
 */
function getBoardGameSearchConditions(
  query: string
): Prisma.BoardGameWhereInput[] {
  return [
    { primaryName: { contains: query, mode: "insensitive" } },
    {
      locales: {
        some: {
          ...PUBLISHED_BOARDGAME_LOCALE_WHERE,
          title: { contains: query, mode: "insensitive" },
        },
      },
    },
    {
      locales: {
        some: {
          ...PUBLISHED_BOARDGAME_LOCALE_WHERE,
          aliases: { has: query },
        },
      },
    },
    {
      locales: {
        some: {
          ...PUBLISHED_BOARDGAME_LOCALE_WHERE,
          searchKeywords: { has: query },
        },
      },
    },
    {
      categories: {
        some: {
          OR: [
            { bggName: { contains: query, mode: "insensitive" } },
            { koName: { contains: query, mode: "insensitive" } },
          ],
        },
      },
    },
    {
      mechanics: {
        some: {
          OR: [
            { bggName: { contains: query, mode: "insensitive" } },
            { koName: { contains: query, mode: "insensitive" } },
          ],
        },
      },
    },
  ];
}
