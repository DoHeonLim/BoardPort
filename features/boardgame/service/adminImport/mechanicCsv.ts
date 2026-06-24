/**
 * File Name : features/boardgame/service/adminImport/mechanicCsv.ts
 * Description : 보드게임 메커니즘 CSV 연결 import 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.30  임도헌   Created   검증된 메커니즘 CSV import 및 보드게임 relation 연결 서비스 추가
 * 2026.05.02  임도헌   Modified  원천 CSV 재import와 분리된 메커니즘 스냅샷 교체 정책 적용
 * 2026.05.03  임도헌   Modified  CSV import transaction 만료 방지를 위해 저장 청크 축소
 * 2026.05.05  임도헌   Modified  검증된 메커니즘 CSV 연결 흐름을 admin.ts에서 분리
 */

import "server-only";
import db from "@/lib/db";
import { parseBoardGameMechanicsCsv } from "@/features/boardgame/service/csv/parseTaxonomyLinks";
import {
  BOARDGAME_IMPORT_TRANSACTION_CHUNK_SIZE,
  BOARDGAME_IMPORT_TRANSACTION_TIMEOUT_MS,
} from "@/features/boardgame/constants";
import {
  getTaxonomyIds,
  syncMechanicTaxonomies,
} from "@/features/boardgame/service/adminImport/taxonomy";
import { chunkItems } from "@/features/boardgame/utils/importHelpers";
import { BoardGameTaxonomyType } from "@/generated/prisma/enums";
import type { ServiceResult } from "@/lib/types";
import type { BoardGameMechanicsCsvImportSummary } from "@/features/boardgame/types/admin";

/**
 * 검증된 메커니즘 CSV를 기존 보드게임에 연결
 *
 * @param csvText - bggId 기준 메커니즘 long CSV 원문
 * @returns {Promise<ServiceResult<BoardGameMechanicsCsvImportSummary>>} 메커니즘 연결 처리 요약
 */
export async function importBoardGameMechanicsFromCsv(
  csvText: string
): Promise<ServiceResult<BoardGameMechanicsCsvImportSummary>> {
  const parsed = parseBoardGameMechanicsCsv(csvText);
  if (!parsed.success) return parsed;

  if (parsed.data.items.length === 0) {
    return {
      success: false,
      error: "가져올 수 있는 검증된 메커니즘 행을 찾지 못했습니다.",
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
    // 메커니즘 CSV는 기존 BoardGame relation 보강 전용이므로 미등록 bggId는 스킵
    const missingItems = parsed.data.items.filter(
      (item) => !boardGameIdByBggId.has(item.bggId)
    );
    const importItems = parsed.data.items.filter((item) =>
      boardGameIdByBggId.has(item.bggId)
    );

    if (importItems.length === 0) {
      return {
        success: false,
        error: "먼저 원천 보드게임 CSV를 가져온 뒤 메커니즘 CSV를 가져와주세요.",
      };
    }

    const taxonomyIdMap = await syncMechanicTaxonomies(importItems);
    let connectedMechanics = 0;

    for (const chunk of chunkItems(
      importItems,
      BOARDGAME_IMPORT_TRANSACTION_CHUNK_SIZE
    )) {
      await db.$transaction(
        async (tx) => {
          for (const item of chunk) {
            const boardGameId = boardGameIdByBggId.get(item.bggId);
            if (!boardGameId) continue;

            const mechanicIds = getTaxonomyIds(
              taxonomyIdMap,
              BoardGameTaxonomyType.MECHANIC,
              item.mechanics
            );
            connectedMechanics += mechanicIds.length;

            // mechanics CSV는 검증 완료 데이터의 현재 스냅샷이므로 기존 메커니즘 연결 전체 교체
            await tx.boardGame.update({
              where: { id: boardGameId },
              data: {
                mechanics: {
                  set: mechanicIds.map((id) => ({ id })),
                },
              },
            });
          }
        },
        {
          timeout: BOARDGAME_IMPORT_TRANSACTION_TIMEOUT_MS,
        }
      );
    }

    return {
      success: true,
      data: {
        connectedGames: importItems.length,
        connectedMechanics,
        skipped: parsed.data.skipped + missingItems.length,
        skippedSamples: [
          ...parsed.data.skippedSamples,
          ...missingItems.slice(0, 5).map((item) => String(item.bggId)),
        ].slice(0, 5),
      },
    };
  } catch (error) {
    console.error("[BoardGame Mechanics CSV Import Save Error]", error);
    return {
      success: false,
      error: "보드게임 메커니즘 CSV 저장에 실패했습니다.",
    };
  }
}
