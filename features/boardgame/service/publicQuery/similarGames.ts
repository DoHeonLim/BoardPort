/**
 * File Name : features/boardgame/service/publicQuery/similarGames.ts
 * Description : 공개 보드게임 유사 추천 조회
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.03  임도헌   Created   taxonomy 공유 기반 유사 보드게임 추천 조회 추가
 * 2026.05.05  임도헌   Modified  taxonomy 공유 기반 유사 게임 추천 조회 분리
 */

import "server-only";
import db from "@/lib/db";
import { PUBLISHED_BOARDGAME_LOCALE_WHERE } from "@/features/boardgame/selects";
import type { ServiceResult } from "@/lib/types";
import type { BoardGameSimilarItem } from "@/features/boardgame/types/public";

/**
 * 현재 보드게임과 카테고리/메커니즘을 공유하는 공개 게임 추천 조회
 * 카테고리는 장르 성격이 강하므로 메커니즘보다 높은 가중치로 정렬 점수 반영
 *
 * @param params - 현재 게임 ID, 공유 비교에 사용할 taxonomy ID, 반환 개수
 * @returns {Promise<ServiceResult<BoardGameSimilarItem[]>>} 유사 게임 추천 목록
 */
export async function getSimilarPublishedBoardGames({
  currentId,
  categoryIds,
  mechanicIds,
  limit = 4,
}: {
  currentId: number;
  categoryIds: number[];
  mechanicIds: number[];
  limit?: number;
}): Promise<ServiceResult<BoardGameSimilarItem[]>> {
  try {
    if (!categoryIds.length && !mechanicIds.length) {
      return { success: true, data: [] };
    }

    const candidates = await db.boardGame.findMany({
      where: {
        id: { not: currentId },
        locales: {
          some: PUBLISHED_BOARDGAME_LOCALE_WHERE,
        },
        OR: [
          ...(categoryIds.length
            ? [{ categories: { some: { id: { in: categoryIds } } } }]
            : []),
          ...(mechanicIds.length
            ? [{ mechanics: { some: { id: { in: mechanicIds } } } }]
            : []),
        ],
      },
      select: {
        id: true,
        primaryName: true,
        yearPublished: true,
        minPlayers: true,
        maxPlayers: true,
        bayesRating: true,
        userRatings: true,
        imageUrl: true,
        locales: {
          where: PUBLISHED_BOARDGAME_LOCALE_WHERE,
          select: {
            title: true,
            shortDescription: true,
          },
          take: 1,
        },
        categories: {
          where: { id: { in: categoryIds } },
          select: { id: true },
        },
        mechanics: {
          where: { id: { in: mechanicIds } },
          select: { id: true },
        },
      },
      orderBy: [
        { bayesRating: "desc" },
        { userRatings: "desc" },
        { id: "desc" },
      ],
      // DB 후보를 넉넉히 확보한 뒤 taxonomy 공유 점수로 애플리케이션 재정렬
      take: Math.max(limit * 6, 16),
    });

    const items = candidates
      .flatMap(({ locales, categories, mechanics, userRatings, ...item }) => {
        const locale = locales[0];
        if (!locale) return [];

        const sharedCategories = categories.length;
        const sharedMechanics = mechanics.length;
        // 장르 유사도는 탐색 의도와 더 가까워 메커니즘보다 높은 점수 부여
        const score = sharedCategories * 3 + sharedMechanics * 2;

        return [
          {
            ...item,
            locale,
            sharedCategories,
            sharedMechanics,
            score,
            userRatings: userRatings ?? 0,
          },
        ];
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if ((b.bayesRating ?? 0) !== (a.bayesRating ?? 0)) {
          return (b.bayesRating ?? 0) - (a.bayesRating ?? 0);
        }
        return b.userRatings - a.userRatings;
      })
      .slice(0, limit)
      .map((item) => ({
        id: item.id,
        primaryName: item.primaryName,
        imageUrl: item.imageUrl,
        yearPublished: item.yearPublished,
        minPlayers: item.minPlayers,
        maxPlayers: item.maxPlayers,
        bayesRating: item.bayesRating,
        locale: item.locale,
        sharedCategories: item.sharedCategories,
        sharedMechanics: item.sharedMechanics,
      }));

    return { success: true, data: items };
  } catch (error) {
    console.error("[BoardGame Similar List Error]", error);
    return {
      success: false,
      error: "비슷한 보드게임을 불러오지 못했습니다.",
    };
  }
}
