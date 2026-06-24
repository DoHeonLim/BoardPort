/**
 * File Name : features/boardgame/service/adminImport/taxonomyNameCsv.ts
 * Description : 보드게임 분류 한국어 표시명 CSV import 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.02  임도헌   Created   분류 한국어 표시명 CSV import 서비스 추가
 * 2026.05.03  임도헌   Modified  기존 taxonomy만 업데이트하고 없는 분류는 생성하지 않는 정책 적용
 * 2026.05.05  임도헌   Modified  taxonomy 한국어 표시명 반영 흐름을 admin.ts에서 분리
 */

import "server-only";
import db from "@/lib/db";
import { parseBoardGameTaxonomyKoreanNameCsv } from "@/features/boardgame/service/csv/parseTaxonomyNames";
import {
  BOARDGAME_IMPORT_TRANSACTION_CHUNK_SIZE,
  BOARDGAME_IMPORT_TRANSACTION_TIMEOUT_MS,
} from "@/features/boardgame/constants";
import {
  getTaxonomyNamesByType,
  taxonomyKey,
} from "@/features/boardgame/service/adminImport/taxonomy";
import { chunkItems } from "@/features/boardgame/utils/importHelpers";
import { BoardGameTaxonomyType } from "@/generated/prisma/enums";
import type { ServiceResult } from "@/lib/types";
import type { BoardGameTaxonomyKoreanNameCsvImportSummary } from "@/features/boardgame/types/admin";

/**
 * 분류 사전의 한국어 표시명을 기존 taxonomy에 반영
 *
 * type + bggName이 이미 존재하는 taxonomy만 업데이트하고, 존재하지 않는 분류는 새로 만들지 않음
 * 원천/메커니즘 CSV import 이후 한국어 표시명 CSV를 별도로 덮어쓰는 검수 흐름 대응
 * categoryGroup(THEME/SUBCATEGORY 등)은 현재 공개 UI에서 분리하지 않고 CATEGORY koName으로만 표현
 *
 * @param csvText - type, bggName, koName 컬럼이 있는 CSV 원문
 * @returns {Promise<ServiceResult<BoardGameTaxonomyKoreanNameCsvImportSummary>>} 분류 표시명 import 처리 요약
 */
export async function importBoardGameTaxonomyKoreanNamesFromCsv(
  csvText: string
): Promise<ServiceResult<BoardGameTaxonomyKoreanNameCsvImportSummary>> {
  const parsed = parseBoardGameTaxonomyKoreanNameCsv(csvText);
  if (!parsed.success) return parsed;

  if (parsed.data.items.length === 0) {
    return {
      success: false,
      error: "가져올 수 있는 분류 한국어명 행을 찾지 못했습니다.",
    };
  }

  try {
    const categoryNames = getTaxonomyNamesByType(
      parsed.data.items,
      BoardGameTaxonomyType.CATEGORY
    );
    const mechanicNames = getTaxonomyNamesByType(
      parsed.data.items,
      BoardGameTaxonomyType.MECHANIC
    );
    const savedTaxonomies = await db.boardGameTaxonomy.findMany({
      where: {
        OR: [
          ...(categoryNames.length
            ? [
                {
                  type: BoardGameTaxonomyType.CATEGORY,
                  bggName: { in: categoryNames },
                },
              ]
            : []),
          ...(mechanicNames.length
            ? [
                {
                  type: BoardGameTaxonomyType.MECHANIC,
                  bggName: { in: mechanicNames },
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        type: true,
        bggName: true,
      },
    });
    const taxonomyIdMap = new Map(
      savedTaxonomies.map((item) => [
        taxonomyKey(item.type, item.bggName),
        item.id,
      ])
    );
    // taxonomy-ko CSV는 표시명 보강 전용. 원문 사전에 없는 행은 새 taxonomy 생성 없이 스킵
    const missingItems = parsed.data.items.filter(
      (item) => !taxonomyIdMap.has(taxonomyKey(item.type, item.bggName))
    );
    const importItems = parsed.data.items.filter((item) =>
      taxonomyIdMap.has(taxonomyKey(item.type, item.bggName))
    );

    if (importItems.length === 0) {
      return {
        success: false,
        error: "먼저 원천/메커니즘 CSV를 가져온 뒤 분류 한국어명 CSV를 가져와주세요.",
      };
    }

    for (const chunk of chunkItems(
      importItems,
      BOARDGAME_IMPORT_TRANSACTION_CHUNK_SIZE
    )) {
      await db.$transaction(
        async (tx) => {
          for (const item of chunk) {
            const taxonomyId = taxonomyIdMap.get(
              taxonomyKey(item.type, item.bggName)
            );
            if (!taxonomyId) continue;

            await tx.boardGameTaxonomy.update({
              where: { id: taxonomyId },
              data: {
                koName: item.koName.trim(),
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
        updated: importItems.length,
        skipped: parsed.data.skipped + missingItems.length,
        skippedSamples: [
          ...parsed.data.skippedSamples,
          ...missingItems.slice(0, 5).map((item) => item.bggName),
        ].slice(0, 5),
      },
    };
  } catch (error) {
    console.error("[BoardGame Taxonomy Korean Name CSV Import Save Error]", error);
    return {
      success: false,
      error: "보드게임 분류 한국어명 CSV 저장에 실패했습니다.",
    };
  }
}
