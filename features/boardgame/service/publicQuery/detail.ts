/**
 * File Name : features/boardgame/service/publicQuery/detail.ts
 * Description : 공개 보드게임 상세 조회
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.28  임도헌   Created   PUBLISHED 한국어 locale 기준 공개 상세 조회 추가
 * 2026.04.28  임도헌   Modified  인기도/추천 인원/시리즈 메타데이터 조회 추가
 * 2026.04.29  임도헌   Modified  직접 URL 접근도 목록과 같은 공개 조건을 적용하도록 보강
 * 2026.05.02  임도헌   Modified  taxonomy 한국어 표시명 조회 의도 주석 추가
 * 2026.05.05  임도헌   Modified  공개 상세 조회 분리
 */

import "server-only";
import db from "@/lib/db";
import { PUBLISHED_BOARDGAME_LOCALE_WHERE } from "@/features/boardgame/selects";
import type { ServiceResult } from "@/lib/types";
import type { BoardGamePublicDetail } from "@/features/boardgame/types/public";

/**
 * 공개 보드게임 상세 조회
 * 원천 메타데이터, 관리자 검수 한국어 locale, category/mechanic 표시명 함께 반환
 *
 * @param id - BoardPort 내부 보드게임 ID
 * @returns {Promise<ServiceResult<BoardGamePublicDetail>>} 공개 보드게임 상세 정보
 */
export async function getPublishedBoardGameDetail(
  id: number
): Promise<ServiceResult<BoardGamePublicDetail>> {
  try {
    const item = await db.boardGame.findFirst({
      where: {
        id,
        // 직접 URL 접근도 목록과 같은 공개 조건을 적용해 초안/미검수 데이터 숨김
        locales: {
          some: PUBLISHED_BOARDGAME_LOCALE_WHERE,
        },
      },
      select: {
        id: true,
        bggId: true,
        primaryName: true,
        bggUrl: true,
        yearPublished: true,
        minPlayers: true,
        maxPlayers: true,
        minPlayTime: true,
        maxPlayTime: true,
        playingTime: true,
        minAge: true,
        weightAverage: true,
        bggRating: true,
        bayesRating: true,
        bggRank: true,
        userRatings: true,
        bestPlayers: true,
        goodPlayers: true,
        family: true,
        kickstarted: true,
        imageUrl: true,
        thumbnailUrl: true,
        locales: {
          where: PUBLISHED_BOARDGAME_LOCALE_WHERE,
          select: {
            title: true,
            aliases: true,
            shortDescription: true,
          },
          take: 1,
        },
        categories: {
          select: {
            id: true,
            bggName: true,
            koName: true,
          },
          orderBy: { bggName: "asc" },
        },
        mechanics: {
          select: {
            id: true,
            bggName: true,
            koName: true,
          },
          orderBy: { bggName: "asc" },
        },
      },
    });

    if (!item) {
      return { success: false, error: "보드게임 정보를 찾을 수 없습니다." };
    }

    const { locales, ...boardGame } = item;
    const locale = locales[0];
    if (!locale) {
      return { success: false, error: "보드게임 정보를 찾을 수 없습니다." };
    }

    return {
      success: true,
      data: {
        ...boardGame,
        locale,
      },
    };
  } catch (error) {
    console.error("[BoardGame Public Detail Error]", error);
    return {
      success: false,
      error: "보드게임 정보를 불러오지 못했습니다.",
    };
  }
}
