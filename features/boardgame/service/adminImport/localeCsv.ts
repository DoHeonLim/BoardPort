/**
 * File Name : features/boardgame/service/adminImport/localeCsv.ts
 * Description : 한국어 보드게임 locale CSV import 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.29  임도헌   Created   한국어 locale CSV import 서비스 추가
 * 2026.04.29  임도헌   Modified  원천 import 이후 검수 데이터만 기존 보드게임에 반영하도록 보강
 * 2026.05.05  임도헌   Modified  한국어 검수 CSV 저장 흐름을 admin.ts에서 분리
 */

import "server-only";
import db from "@/lib/db";
import { parseBoardGameKoreanLocaleCsv } from "@/features/boardgame/service/csv/parseLocale";
import {
  BOARDGAME_IMPORT_TRANSACTION_CHUNK_SIZE,
  BOARDGAME_IMPORT_TRANSACTION_TIMEOUT_MS,
} from "@/features/boardgame/constants";
import { upsertBoardGameLocale } from "@/features/boardgame/service/adminImport/persistence";
import { chunkItems } from "@/features/boardgame/utils/importHelpers";
import type { ServiceResult } from "@/lib/types";
import type { BoardGameLocaleCsvImportSummary } from "@/features/boardgame/types/admin";

/**
 * 검수된 한국어 locale CSV를 기존 보드게임에 반영
 *
 * @param adminId - import를 수행한 관리자 ID
 * @param csvText - bggId 기준 한국어 표시 데이터 CSV 원문
 * @returns {Promise<ServiceResult<BoardGameLocaleCsvImportSummary>>} locale import 처리 요약
 */
export async function importBoardGameKoreanLocalesFromCsv(
  adminId: number,
  csvText: string
): Promise<ServiceResult<BoardGameLocaleCsvImportSummary>> {
  const parsed = parseBoardGameKoreanLocaleCsv(csvText);
  if (!parsed.success) return parsed;

  if (parsed.data.items.length === 0) {
    return {
      success: false,
      error: "가져올 수 있는 한국어 보드게임 행을 찾지 못했습니다.",
    };
  }

  try {
    const boardGames = await db.boardGame.findMany({
      where: {
        bggId: {
          in: parsed.data.items.map((item) => item.bggId),
        },
      },
      select: {
        id: true,
        bggId: true,
      },
    });
    const boardGameIdByBggId = new Map(
      boardGames.map((item) => [item.bggId, item.id])
    );
    // locale CSV는 원천 import 이후의 검수 데이터이므로 DB에 없는 BGG ID 생성 없이 스킵
    const missingItems = parsed.data.items.filter(
      (item) => !boardGameIdByBggId.has(item.bggId)
    );
    const importItems = parsed.data.items.filter((item) =>
      boardGameIdByBggId.has(item.bggId)
    );

    if (importItems.length === 0) {
      return {
        success: false,
        error: "먼저 원천 보드게임 CSV를 가져온 뒤 한국어 CSV를 가져와주세요.",
      };
    }

    const existingLocales = await db.boardGameLocale.findMany({
      where: {
        locale: "ko",
        boardGameId: {
          in: importItems.flatMap((item) => {
            const id = boardGameIdByBggId.get(item.bggId);
            return id ? [id] : [];
          }),
        },
      },
      select: {
        boardGameId: true,
      },
    });
    const existingBoardGameIds = new Set(
      existingLocales.map((item) => item.boardGameId)
    );

    for (const chunk of chunkItems(
      importItems,
      BOARDGAME_IMPORT_TRANSACTION_CHUNK_SIZE
    )) {
      await db.$transaction(
        async (tx) => {
          for (const item of chunk) {
            const boardGameId = boardGameIdByBggId.get(item.bggId);
            if (!boardGameId) continue;

            await upsertBoardGameLocale(tx, adminId, boardGameId, item);
          }
        },
        {
          timeout: BOARDGAME_IMPORT_TRANSACTION_TIMEOUT_MS,
        }
      );
    }

    const updated = importItems.filter((item) => {
      const boardGameId = boardGameIdByBggId.get(item.bggId);
      return boardGameId ? existingBoardGameIds.has(boardGameId) : false;
    }).length;

    return {
      success: true,
      data: {
        imported: importItems.length,
        created: importItems.length - updated,
        updated,
        skipped: parsed.data.skipped + missingItems.length,
        skippedSamples: [
          ...parsed.data.skippedSamples,
          ...missingItems.slice(0, 5).map((item) => String(item.bggId)),
        ].slice(0, 5),
      },
    };
  } catch (error) {
    console.error("[BoardGame Korean Locale CSV Import Save Error]", error);
    return {
      success: false,
      error: "한국어 보드게임 CSV 저장에 실패했습니다.",
    };
  }
}
