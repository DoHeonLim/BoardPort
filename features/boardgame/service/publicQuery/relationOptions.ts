/**
 * File Name : features/boardgame/service/publicQuery/relationOptions.ts
 * Description : 보드게임 연결 선택용 공개 option 조회
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.03  임도헌   Created   상품/게시글/방송 연결 선택용 공개 보드게임 옵션 조회 추가
 * 2026.05.03  임도헌   Modified  상품 폼 게임 정보 자동 입력에 필요한 인원/시간 메타데이터 포함
 * 2026.05.05  임도헌   Modified  상품/게시글/방송 작성 폼용 보드게임 option 조회 분리
 * 2026.09.10  임도헌   Modified  도감 작성 진입 게임을 기본 옵션 제한과 무관하게 포함
 */

import "server-only";
import db from "@/lib/db";
import { PUBLISHED_BOARDGAME_LOCALE_WHERE } from "@/features/boardgame/selects";
import type { ServiceResult } from "@/lib/types";
import type { BoardGameRelationOption } from "@/features/boardgame/types/public";
import type { Prisma } from "@/generated/prisma/client";

const BOARD_GAME_RELATION_OPTION_SELECT = {
  id: true,
  primaryName: true,
  imageUrl: true,
  minPlayers: true,
  maxPlayers: true,
  minPlayTime: true,
  maxPlayTime: true,
  playingTime: true,
  locales: {
    where: PUBLISHED_BOARDGAME_LOCALE_WHERE,
    select: {
      title: true,
      aliases: true,
    },
    take: 1,
  },
} satisfies Prisma.BoardGameSelect;

interface BoardGameRelationOptionsInput {
  limit?: number;
  includeIds?: number[];
}

/**
 * 상품/게시글/방송 작성 폼에서 연결 가능한 공개 보드게임 목록 조회
 * 작성 경험을 빠르게 유지하기 위해 공개 조건을 통과한 카탈로그 항목만 가벼운 option 형태로 내려줌
 *
 * @param input - 기본 제한과 반드시 포함할 공개 보드게임 ID
 * @returns {Promise<ServiceResult<BoardGameRelationOption[]>>} 연결 선택용 보드게임 옵션
 */
export async function getBoardGameRelationOptions({
  limit = 700,
  includeIds = [],
}: BoardGameRelationOptionsInput = {}): Promise<
  ServiceResult<BoardGameRelationOption[]>
> {
  try {
    const normalizedIncludeIds = Array.from(
      new Set(includeIds.filter((id) => Number.isSafeInteger(id) && id > 0))
    ).slice(0, 5);
    const publicWhere = {
      locales: {
        some: PUBLISHED_BOARDGAME_LOCALE_WHERE,
      },
    } satisfies Prisma.BoardGameWhereInput;
    const [items, includedItems] = await Promise.all([
      db.boardGame.findMany({
        where: publicWhere,
        select: BOARD_GAME_RELATION_OPTION_SELECT,
        orderBy: [
          { bggRank: { sort: "asc", nulls: "last" } },
          { userRatings: { sort: "desc", nulls: "last" } },
          { id: "asc" },
        ],
        take: limit,
      }),
      normalizedIncludeIds.length
        ? db.boardGame.findMany({
            where: {
              ...publicWhere,
              id: { in: normalizedIncludeIds },
            },
            select: BOARD_GAME_RELATION_OPTION_SELECT,
          })
        : Promise.resolve([]),
    ]);
    const mergedItems = [...items];
    const existingIds = new Set(items.map((item) => item.id));

    includedItems.forEach((item) => {
      if (existingIds.has(item.id)) return;
      mergedItems.push(item);
      existingIds.add(item.id);
    });

    return {
      success: true,
      data: mergedItems.flatMap(({ locales, ...item }) => {
        const locale = locales[0];
        // 폼 선택지는 공개 검수 locale이 있는 항목만 제공
        if (!locale) return [];
        return [{ ...item, locale }];
      }),
    };
  } catch (error) {
    console.error("[BoardGame Relation Options Error]", error);
    return {
      success: false,
      error: "연결 가능한 보드게임 목록을 불러오지 못했습니다.",
    };
  }
}
