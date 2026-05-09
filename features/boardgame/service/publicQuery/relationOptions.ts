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
 */

import "server-only";
import db from "@/lib/db";
import { PUBLISHED_BOARDGAME_LOCALE_WHERE } from "@/features/boardgame/selects";
import type { ServiceResult } from "@/lib/types";
import type { BoardGameRelationOption } from "@/features/boardgame/types/public";

/**
 * 상품/게시글/방송 작성 폼에서 연결 가능한 공개 보드게임 목록 조회
 * 작성 경험을 빠르게 유지하기 위해 공개 조건을 통과한 카탈로그 항목만 가벼운 option 형태로 내려줌
 *
 * @param limit - 반환할 최대 옵션 수
 * @returns {Promise<ServiceResult<BoardGameRelationOption[]>>} 연결 선택용 보드게임 옵션
 */
export async function getBoardGameRelationOptions(
  limit = 700
): Promise<ServiceResult<BoardGameRelationOption[]>> {
  try {
    const items = await db.boardGame.findMany({
      where: {
        locales: {
          some: PUBLISHED_BOARDGAME_LOCALE_WHERE,
        },
      },
      select: {
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
      },
      orderBy: [
        { bggRank: { sort: "asc", nulls: "last" } },
        { userRatings: { sort: "desc", nulls: "last" } },
        { id: "asc" },
      ],
      take: limit,
    });

    return {
      success: true,
      data: items.flatMap(({ locales, ...item }) => {
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
