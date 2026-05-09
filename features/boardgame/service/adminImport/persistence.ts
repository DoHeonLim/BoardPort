/**
 * File Name : features/boardgame/service/adminImport/persistence.ts
 * Description : 관리자 보드게임 import 저장 helper
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.28  임도헌   Created   BoardGame/BoardGameLocale import 저장 로직 추가
 * 2026.04.29  임도헌   Modified  원천 CSV 재import와 한국어 locale 보존 정책 정리
 * 2026.05.02  임도헌   Modified  원천 CSV 재import 시 별도 메커니즘 연결 보존 옵션 추가
 * 2026.05.03  임도헌   Modified  대량 CSV import helper의 덮어쓰기/보존 정책 주석 보강
 * 2026.05.05  임도헌   Modified  BoardGame/BoardGameLocale upsert helper 분리
 */

import "server-only";
import { BoardGameLocaleStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { normalizeStringList } from "@/features/boardgame/utils/importHelpers";
import type {
  BoardGameKoreanLocaleImportPayload,
  BoardGameMetadataImportPayload,
} from "@/features/boardgame/types/import";

/**
 * BGG ID 기준으로 원천 보드게임 메타데이터를 생성/갱신
 *
 * raw CSV 재import는 bggId가 같은 기존 데이터를 최신 seed 값으로 덮어씀
 * 다만 raw CSV에 mechanics 컬럼이 없을 수 있으므로, 별도 검증 CSV로 연결한 메커니즘은
 * `replaceMechanics=false`일 때 보존
 *
 * @param tx - Prisma transaction client
 * @param payload - 정규화된 원천 메타데이터
 * @param relationIds - 연결할 category/mechanic taxonomy ID와 mechanics 교체 여부
 * @returns 저장된 보드게임 요약
 */
export async function upsertBoardGame(
  tx: Prisma.TransactionClient,
  payload: BoardGameMetadataImportPayload,
  relationIds: {
    categoryIds: number[];
    mechanicIds: number[];
    replaceMechanics: boolean;
  }
) {
  const data = {
    primaryName: payload.primaryName,
    bggUrl: payload.bggUrl,
    yearPublished: payload.yearPublished,
    minPlayers: payload.minPlayers,
    maxPlayers: payload.maxPlayers,
    minPlayTime: payload.minPlayTime,
    maxPlayTime: payload.maxPlayTime,
    playingTime: payload.playingTime,
    minAge: payload.minAge,
    weightAverage: payload.weightAverage,
    bggRating: payload.bggRating,
    bayesRating: payload.bayesRating,
    bggRank: payload.bggRank,
    userRatings: payload.userRatings,
    bestPlayers: payload.bestPlayers,
    goodPlayers: payload.goodPlayers,
    family: payload.family,
    kickstarted: payload.kickstarted,
    imageUrl: payload.imageUrl,
    thumbnailUrl: payload.thumbnailUrl,
    lastSyncedAt: new Date(),
  };

  return tx.boardGame.upsert({
    where: { bggId: payload.bggId },
    update: {
      ...data,
      categories: {
        set: relationIds.categoryIds.map((id) => ({ id })),
      },
      // raw 재import 파일에 mechanics 컬럼이 없으면 기존 검증 메커니즘 연결 보존
      ...(relationIds.replaceMechanics
        ? {
            mechanics: {
              set: relationIds.mechanicIds.map((id) => ({ id })),
            },
          }
        : {}),
    },
    create: {
      bggId: payload.bggId,
      ...data,
      categories: {
        connect: relationIds.categoryIds.map((id) => ({ id })),
      },
      ...(relationIds.mechanicIds.length
        ? {
            mechanics: {
              connect: relationIds.mechanicIds.map((id) => ({ id })),
            },
          }
        : {}),
    },
    select: {
      id: true,
      bggId: true,
      primaryName: true,
    },
  });
}

/**
 * 한국어 locale 검수 데이터를 boardGameId+locale 기준으로 생성/갱신
 *
 * 원천 메타데이터 import와 분리된 운영 데이터이므로,
 * CSV import 시에도 title, aliases, shortDescription, searchKeywords, status만 명시적 반영
 *
 * @param tx - Prisma transaction client
 * @param adminId - 검수/반영 관리자 ID
 * @param boardGameId - BoardPort 내부 보드게임 ID
 * @param payload - 한국어 locale CSV payload
 * @returns 저장된 locale ID
 */
export async function upsertBoardGameLocale(
  tx: Prisma.TransactionClient,
  adminId: number,
  boardGameId: number,
  payload: BoardGameKoreanLocaleImportPayload
) {
  const status = payload.status ?? BoardGameLocaleStatus.DRAFT;
  const title = payload.title.trim();
  const shortDescription = payload.shortDescription?.trim() || null;
  const shouldMarkReviewed =
    status === BoardGameLocaleStatus.REVIEWED ||
    status === BoardGameLocaleStatus.PUBLISHED;
  const reviewedAt = shouldMarkReviewed ? new Date() : null;

  return tx.boardGameLocale.upsert({
    where: {
      boardGameId_locale: {
        boardGameId,
        locale: "ko",
      },
    },
    update: {
      title,
      aliases: normalizeStringList(payload.aliases),
      shortDescription,
      searchKeywords: normalizeStringList(payload.searchKeywords),
      status,
      sourceType: payload.sourceType,
      reviewedById: shouldMarkReviewed ? adminId : null,
      reviewedAt,
    },
    create: {
      boardGameId,
      locale: "ko",
      title,
      aliases: normalizeStringList(payload.aliases),
      shortDescription,
      searchKeywords: normalizeStringList(payload.searchKeywords),
      status,
      sourceType: payload.sourceType,
      reviewedById: shouldMarkReviewed ? adminId : null,
      reviewedAt,
    },
    select: {
      id: true,
    },
  });
}
