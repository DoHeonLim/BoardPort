/**
 * File Name : features/boardgame/service/csv/parseTaxonomyLinks.ts
 * Description : 보드게임 taxonomy relation CSV parser
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.30  임도헌   Created   검증된 메커니즘 CSV parser 추가
 * 2026.05.03  임도헌   Modified  검증된 카테고리 CSV parser 추가
 * 2026.05.03  임도헌   Modified  value/confidence/reviewNeeded 기준 검증 행 filtering 반영
 * 2026.05.05  임도헌   Modified  카테고리/메커니즘 relation CSV parser 분리
 */

import "server-only";
import {
  isTruthyCsvFlag,
  parseCsv,
  readBoolean,
  readNumber,
  readString,
  toCsvRow,
} from "@/features/boardgame/utils/csv";
import type { ServiceResult } from "@/lib/types";
import type {
  BoardGameCategoriesImportPayload,
  BoardGameMechanicsImportPayload,
  BoardGameTaxonomyItem,
} from "@/features/boardgame/types/import";

interface BoardGameMechanicsCsvParseResult {
  items: BoardGameMechanicsImportPayload[];
  rowsRead: number;
  skipped: number;
  skippedSamples: string[];
}

interface BoardGameCategoriesCsvParseResult {
  items: BoardGameCategoriesImportPayload[];
  rowsRead: number;
  skipped: number;
  skippedSamples: string[];
}

/**
 * BGG 기반 메커니즘 long CSV를 게임별 메커니즘 import payload로 변환
 *
 * - MVP 검증 원천 메커니즘만 연결하기 위한 `value=1`, `confidence=VERIFIED`, `reviewNeeded=false` 행 통과
 * - 현 many-to-many 모델에 confidence/source를 보존하지 않는 AI 추론 메커니즘 import 제외
 *
 * @param csvText - bggId, mechanicName, value, confidence, reviewNeeded 컬럼이 있는 CSV 원문
 * @returns 정규화된 메커니즘 import 후보
 */
export function parseBoardGameMechanicsCsv(
  csvText: string
): ServiceResult<BoardGameMechanicsCsvParseResult> {
  return parseVerifiedTaxonomyLinkCsv<"mechanics">({
    csvText,
    taxonomyField: "mechanics",
    taxonomyNameAliases: [
      "mechanicName",
      "Mechanic Name",
      "Mechanic",
      "Mechanics",
    ],
    errorLabel: "보드게임 메커니즘",
    consoleLabel: "[BoardGame Mechanics CSV Parse Error]",
  });
}

/**
 * BGG 기반 카테고리 long CSV를 게임별 카테고리 import payload로 변환
 *
 * - raw CSV의 Cat:* 자동 추출값을 검수된 카테고리 snapshot으로 덮어쓸 때 사용
 * - categoryGroup(THEME/SUBCATEGORY 등)은 현재 모델에 별도 보존하지 않고 CATEGORY taxonomy로 통합
 *
 * @param csvText - bggId, categoryName, value, confidence, reviewNeeded 컬럼이 있는 CSV 원문
 * @returns 정규화된 카테고리 import 후보
 */
export function parseBoardGameCategoriesCsv(
  csvText: string
): ServiceResult<BoardGameCategoriesCsvParseResult> {
  return parseVerifiedTaxonomyLinkCsv<"categories">({
    csvText,
    taxonomyField: "categories",
    taxonomyNameAliases: [
      "categoryName",
      "Category Name",
      "Category",
      "Categories",
    ],
    errorLabel: "보드게임 카테고리",
    consoleLabel: "[BoardGame Categories CSV Parse Error]",
  });
}

/**
 * 검증 완료된 long-form taxonomy CSV를 게임별 relation payload로 그룹화
 *
 * @param options - taxonomy field, 컬럼 alias와 오류 표시 문구
 * @returns 게임별 카테고리 또는 메커니즘 import 후보
 */
function parseVerifiedTaxonomyLinkCsv<TField extends "mechanics" | "categories">({
  csvText,
  taxonomyField,
  taxonomyNameAliases,
  errorLabel,
  consoleLabel,
}: {
  csvText: string;
  taxonomyField: TField;
  taxonomyNameAliases: string[];
  errorLabel: string;
  consoleLabel: string;
}): ServiceResult<
  TField extends "mechanics"
    ? BoardGameMechanicsCsvParseResult
    : BoardGameCategoriesCsvParseResult
> {
  try {
    const rows = parseCsv(csvText);
    if (rows.length < 2) {
      return {
        success: false,
        error: "CSV 헤더와 데이터 행을 확인해주세요.",
      };
    }

    const headers = rows[0].map((header) => header.trim());
    const dataRows = rows.slice(1);
    const itemByBggId = new Map<
      number,
      {
        bggId: number;
        primaryName: string | null;
        taxonomyNames: Set<string>;
      }
    >();
    const skippedSamples: string[] = [];
    let skipped = 0;

    for (const rawRow of dataRows) {
      const row = toCsvRow(headers, rawRow);
      const bggId = readNumber(row, ["bggId", "BGGId", "BGG ID"]);
      const primaryName = readString(row, [
        "primaryName",
        "Primary Name",
        "Name",
      ]);
      const taxonomyName = readString(row, taxonomyNameAliases);
      const value = readString(row, ["value", "Value"]);
      const confidence = readString(row, ["confidence", "Confidence"]);
      const reviewNeeded = readBoolean(row, [
        "reviewNeeded",
        "Review Needed",
      ]);

      // 현 relation 모델은 출처/신뢰도 컬럼을 보존하지 않으므로 검증 완료 현재 스냅샷만 반영
      if (
        !bggId ||
        !taxonomyName ||
        !isTruthyCsvFlag(value ?? "") ||
        confidence?.trim().toUpperCase() !== "VERIFIED" ||
        reviewNeeded === true
      ) {
        skipped += 1;
        if (skippedSamples.length < 5) {
          skippedSamples.push(
            taxonomyName ||
              primaryName ||
              String(bggId || rawRow[0] || "알 수 없는 행")
          );
        }
        continue;
      }

      const existing = itemByBggId.get(bggId);
      if (existing) {
        existing.taxonomyNames.add(taxonomyName);
      } else {
        itemByBggId.set(bggId, {
          bggId,
          primaryName,
          taxonomyNames: new Set([taxonomyName]),
        });
      }
    }

    return {
      success: true,
      data: {
        // long-form CSV의 여러 행을 bggId 단위로 묶어 한 번의 relation 교체 payload로 축약
        items: Array.from(itemByBggId.values()).map((item) =>
          toTaxonomyPayload(item, taxonomyField)
        ),
        rowsRead: dataRows.length,
        skipped,
        skippedSamples,
      },
    } as unknown as ServiceResult<
      TField extends "mechanics"
        ? BoardGameMechanicsCsvParseResult
        : BoardGameCategoriesCsvParseResult
    >;
  } catch (error) {
    console.error(consoleLabel, error);
    return {
      success: false,
      error: `${errorLabel} CSV를 읽는 중 오류가 발생했습니다.`,
    };
  }
}

/**
 * 같은 bggId로 묶인 taxonomy name set을 저장 payload 형태로 변환
 *
 * @param item - bggId와 taxonomy name set
 * @param taxonomyField - payload에 채울 taxonomy field 이름
 * @returns 카테고리 또는 메커니즘 import payload
 */
function toTaxonomyPayload<TField extends "mechanics" | "categories">(
  item: {
    bggId: number;
    primaryName: string | null;
    taxonomyNames: Set<string>;
  },
  taxonomyField: TField
): TField extends "mechanics"
  ? BoardGameMechanicsImportPayload
  : BoardGameCategoriesImportPayload {
  const taxonomies: BoardGameTaxonomyItem[] = Array.from(
    item.taxonomyNames
  ).map((name) => ({ name }));

  return {
    bggId: item.bggId,
    primaryName: item.primaryName,
    [taxonomyField]: taxonomies,
  } as unknown as TField extends "mechanics"
    ? BoardGameMechanicsImportPayload
    : BoardGameCategoriesImportPayload;
}
