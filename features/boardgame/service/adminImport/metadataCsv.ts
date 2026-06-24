/**
 * File Name : features/boardgame/service/adminImport/metadataCsv.ts
 * Description : Kaggle 보드게임 원천 메타데이터 CSV import 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.28  임도헌   Created   보드게임 import 서비스 추가
 * 2026.04.28  임도헌   Modified  BGG API import를 Kaggle CSV 기반 import로 전환
 * 2026.04.28  임도헌   Modified  보드게임 인기도/추천 인원/시리즈 메타데이터 저장 추가
 * 2026.04.29  임도헌   Modified  Kaggle CSV 재import와 locale 보존 흐름 주석 정리
 * 2026.04.29  임도헌   Modified  CSV import transaction timeout 방지를 위한 taxonomy 사전 동기화 및 chunk 저장 적용
 * 2026.05.02  임도헌   Modified  원천 CSV 재import 시 별도 메커니즘 CSV 연결 보존
 * 2026.05.03  임도헌   Modified  CSV import transaction 만료 방지를 위해 저장 청크 축소
 * 2026.05.03  임도헌   Modified  대량 CSV import helper의 덮어쓰기/보존 정책 주석 보강
 * 2026.05.05  임도헌   Modified  원천 메타데이터 CSV 저장 흐름을 admin.ts에서 분리
 */

import "server-only";
import db from "@/lib/db";
import { parseKaggleBoardGameCsv } from "@/features/boardgame/service/csv/parseMetadata";
import {
  BOARDGAME_IMPORT_TRANSACTION_CHUNK_SIZE,
  BOARDGAME_IMPORT_TRANSACTION_TIMEOUT_MS,
} from "@/features/boardgame/constants";
import {
  getTaxonomyIds,
  syncTaxonomies,
} from "@/features/boardgame/service/adminImport/taxonomy";
import { upsertBoardGame } from "@/features/boardgame/service/adminImport/persistence";
import { chunkItems } from "@/features/boardgame/utils/importHelpers";
import {
  BoardGameLocaleSource,
  BoardGameLocaleStatus,
  BoardGameTaxonomyType,
} from "@/generated/prisma/enums";
import type { ServiceResult } from "@/lib/types";
import type { BoardGameCsvImportSummary } from "@/features/boardgame/types/admin";

/**
 * Kaggle CSV에서 보드게임 메타데이터를 가져와 DB에 저장
 *
 * @param csvText - Kaggle에서 내려받은 BGG 기반 CSV 원문
 * @returns {Promise<ServiceResult<BoardGameCsvImportSummary>>} import 처리 요약
 */
export async function importBoardGamesFromKaggleCsv(
  csvText: string
): Promise<ServiceResult<BoardGameCsvImportSummary>> {
  const parsed = parseKaggleBoardGameCsv(csvText);
  if (!parsed.success) return parsed;

  if (parsed.data.items.length === 0) {
    return {
      success: false,
      error: "가져올 수 있는 보드게임 행을 찾지 못했습니다.",
    };
  }

  try {
    const existing = await db.boardGame.findMany({
      where: {
        bggId: {
          in: parsed.data.items.map((item) => item.bggId),
        },
      },
      select: { bggId: true },
    });
    const existingBggIds = new Set(existing.map((item) => item.bggId));
    // taxonomy upsert는 본문 transaction 밖에서 먼저 처리해 대량 import timeout 위험 축소
    const taxonomyIdMap = await syncTaxonomies(parsed.data.items);

    for (const chunk of chunkItems(
      parsed.data.items,
      BOARDGAME_IMPORT_TRANSACTION_CHUNK_SIZE
    )) {
      await db.$transaction(
        async (tx) => {
          for (const item of chunk) {
            // raw CSV는 category만 포함할 수 있으므로 별도 mechanics CSV 연결값 보존을 위한 분리 처리
            const categoryIds = getTaxonomyIds(
              taxonomyIdMap,
              BoardGameTaxonomyType.CATEGORY,
              item.categories
            );
            const mechanicIds = getTaxonomyIds(
              taxonomyIdMap,
              BoardGameTaxonomyType.MECHANIC,
              item.mechanics
            );

            const saved = await upsertBoardGame(tx, item, {
              categoryIds,
              mechanicIds,
              replaceMechanics: item.mechanics.length > 0,
            });

            // 원천 메타데이터를 재import해도 관리자가 검수한 한국어 locale은 덮어쓰지 않음
            await tx.boardGameLocale.upsert({
              where: {
                boardGameId_locale: {
                  boardGameId: saved.id,
                  locale: "ko",
                },
              },
              update: {},
              create: {
                boardGameId: saved.id,
                locale: "ko",
                title: item.primaryName,
                aliases: [],
                searchKeywords: [],
                status: BoardGameLocaleStatus.DRAFT,
                sourceType: BoardGameLocaleSource.BGG_METADATA,
              },
            });
          }
        },
        {
          timeout: BOARDGAME_IMPORT_TRANSACTION_TIMEOUT_MS,
        }
      );
    }

    const updated = parsed.data.items.filter((item) =>
      existingBggIds.has(item.bggId)
    ).length;

    return {
      success: true,
      data: {
        imported: parsed.data.items.length,
        created: parsed.data.items.length - updated,
        updated,
        skipped: parsed.data.skipped,
        skippedSamples: parsed.data.skippedSamples,
        truncated: parsed.data.truncated,
      },
    };
  } catch (error) {
    console.error("[BoardGame Kaggle CSV Import Save Error]", error);
    return {
      success: false,
      error: "Kaggle 보드게임 메타데이터 저장에 실패했습니다.",
    };
  }
}
