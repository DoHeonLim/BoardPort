/**
 * File Name : features/boardgame/service/publicQuery/filters.ts
 * Description : 공개 보드게임 목록 필터/정렬 query helper
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.03  임도헌   Created   인원/시간/난이도 필터와 정렬 조건 추가
 * 2026.05.03  임도헌   Modified  오래된 seed 랭킹을 기본 정렬 내부 보조값으로만 사용하도록 주석 정리
 * 2026.05.03  임도헌   Modified  공개 목록 정렬에서 null 메타데이터가 마지막에 오도록 보정
 * 2026.05.05  임도헌   Modified  인원/시간/난이도 필터와 정렬 조건 분리
 */

import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type {
  BoardGameCatalogFilters,
  BoardGameSortOption,
} from "@/features/boardgame/types/catalog";

/**
 * 공개 목록 필터 값의 Prisma where 조건 배열 변환
 *
 * @param filters - URL에서 정규화한 카탈로그 필터
 * @returns AND 조건에 병합할 Prisma where input 목록
 */
export function getBoardGameFilterConditions(
  filters: BoardGameCatalogFilters
): Prisma.BoardGameWhereInput[] {
  const conditions: Prisma.BoardGameWhereInput[] = [];

  if (filters.players) {
    conditions.push(getPlayerFilterCondition(filters.players));
  }

  if (filters.playTime) {
    conditions.push(getPlayTimeFilterCondition(filters.playTime));
  }

  if (filters.weight) {
    conditions.push(getWeightFilterCondition(filters.weight));
  }

  return conditions;
}

/**
 * 공개 목록 정렬 옵션의 Prisma orderBy 배열 변환
 *
 * @param sort - 카탈로그 정렬 옵션
 * @returns null 메타데이터를 뒤로 보내는 orderBy 조건
 */
export function getBoardGameOrderBy(
  sort: BoardGameSortOption = "rank"
): Prisma.BoardGameOrderByWithRelationInput[] {
  switch (sort) {
    case "rating":
      return [
        { bayesRating: { sort: "desc", nulls: "last" } },
        { bggRating: { sort: "desc", nulls: "last" } },
        { userRatings: { sort: "desc", nulls: "last" } },
        { id: "desc" },
      ];
    case "popular":
      return [
        { userRatings: { sort: "desc", nulls: "last" } },
        { bggRank: { sort: "asc", nulls: "last" } },
        { id: "desc" },
      ];
    case "newest":
      return [
        { yearPublished: { sort: "desc", nulls: "last" } },
        { bggRank: { sort: "asc", nulls: "last" } },
        { id: "desc" },
      ];
    case "rank":
      // seed 랭킹은 최신 랭킹으로 노출하지 않고 기본 카탈로그 정렬 보조값으로만 사용
      return [
        { bggRank: { sort: "asc", nulls: "last" } },
        { userRatings: { sort: "desc", nulls: "last" } },
        { id: "desc" },
      ];
  }
}

/**
 * 인원 필터의 min/max player 범위 조건 변환
 *
 * @param players - 인원 필터 값
 * @returns Prisma where input
 */
function getPlayerFilterCondition(
  players: NonNullable<BoardGameCatalogFilters["players"]>
): Prisma.BoardGameWhereInput {
  switch (players) {
    case "solo":
      return { minPlayers: { lte: 1 }, maxPlayers: { gte: 1 } };
    case "two":
      return { minPlayers: { lte: 2 }, maxPlayers: { gte: 2 } };
    case "threeFour":
      return { minPlayers: { lte: 4 }, maxPlayers: { gte: 3 } };
    case "group":
      return { maxPlayers: { gte: 5 } };
  }
}

/**
 * 플레이 시간 필터의 대표 시간/최소·최대 시간 조건 변환
 *
 * @param playTime - 플레이 시간 필터 값
 * @returns Prisma where input
 */
function getPlayTimeFilterCondition(
  playTime: NonNullable<BoardGameCatalogFilters["playTime"]>
): Prisma.BoardGameWhereInput {
  switch (playTime) {
    case "short":
      return {
        OR: [{ playingTime: { lte: 30 } }, { maxPlayTime: { lte: 30 } }],
      };
    case "standard":
      return {
        // 대표 시간과 min/max 범위 중 하나만 있는 seed도 중간 시간대로 매칭
        OR: [
          { playingTime: { gt: 30, lte: 90 } },
          { minPlayTime: { lte: 90 }, maxPlayTime: { gte: 31 } },
        ],
      };
    case "long":
      return {
        OR: [{ playingTime: { gte: 91 } }, { maxPlayTime: { gte: 91 } }],
      };
  }
}

/**
 * BGG weight 평균값 기준 난이도 필터 조건 생성
 *
 * @param weight - 난이도 필터 값
 * @returns Prisma where input
 */
function getWeightFilterCondition(
  weight: NonNullable<BoardGameCatalogFilters["weight"]>
): Prisma.BoardGameWhereInput {
  switch (weight) {
    case "light":
      return { weightAverage: { lte: 2 } };
    case "medium":
      return { weightAverage: { gt: 2, lte: 3.2 } };
    case "heavy":
      return { weightAverage: { gt: 3.2 } };
  }
}
