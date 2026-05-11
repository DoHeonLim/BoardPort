/**
 * File Name : features/boardgame/service/csv/parseTaxonomyNames.ts
 * Description : 보드게임 taxonomy 한국어 표시명 CSV parser
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.02  임도헌   Created   taxonomy 한국어 표시명 CSV parser 추가
 * 2026.05.03  임도헌   Modified  CATEGORY/MECHANIC 타입 검증과 koName 필수 조건 반영
 * 2026.05.05  임도헌   Modified  taxonomy 한국어 표시명 CSV parser 분리
 */

import "server-only";
import {
  parseCsv,
  readString,
  readTaxonomyType,
  toCsvRow,
} from "@/features/boardgame/utils/csv";
import type { ServiceResult } from "@/lib/types";
import type { BoardGameTaxonomyKoreanNameImportPayload } from "@/features/boardgame/types/import";

interface BoardGameTaxonomyKoreanNameCsvParseResult {
  items: BoardGameTaxonomyKoreanNameImportPayload[];
  rowsRead: number;
  skipped: number;
  skippedSamples: string[];
}

/**
 * category/mechanic 한국어 표시명 CSV를 import payload로 변환
 *
 * 기존 BoardGameTaxonomy 사전을 기준으로 koName만 보강하기 위한 CSV이므로,
 * type + bggName + koName이 모두 있는 행만 통과
 *
 * @param csvText - type, bggName, koName 컬럼이 있는 CSV 원문
 * @returns 정규화된 분류 표시명 후보
 */
export function parseBoardGameTaxonomyKoreanNameCsv(
  csvText: string
): ServiceResult<BoardGameTaxonomyKoreanNameCsvParseResult> {
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
    const items: BoardGameTaxonomyKoreanNameImportPayload[] = [];
    const seenKeys = new Set<string>();
    const skippedSamples: string[] = [];
    let skipped = 0;

    for (const rawRow of dataRows) {
      const row = toCsvRow(headers, rawRow);
      const type = readTaxonomyType(row);
      const bggName = readString(row, [
        "bggName",
        "BGG Name",
        "name",
        "taxonomyName",
        "원문 분류명",
      ]);
      const koName = readString(row, [
        "koName",
        "Korean Name",
        "koreanName",
        "한국어명",
        "표시명",
      ]);
      const key = type && bggName ? `${type}:${bggName}` : null;

      // 같은 type+bggName 반복 시 첫 번째 검수값만 사용해 import 결과 예측 가능성 유지
      if (!type || !bggName || !koName || !key || seenKeys.has(key)) {
        skipped += 1;
        if (skippedSamples.length < 5) {
          skippedSamples.push(bggName || koName || rawRow[0] || "알 수 없는 행");
        }
        continue;
      }

      seenKeys.add(key);
      items.push({
        type,
        bggName,
        koName,
      });
    }

    return {
      success: true,
      data: {
        items,
        rowsRead: dataRows.length,
        skipped,
        skippedSamples,
      },
    };
  } catch (error) {
    console.error("[BoardGame Taxonomy Korean Name CSV Parse Error]", error);
    return {
      success: false,
      error: "보드게임 분류 한국어명 CSV를 읽는 중 오류가 발생했습니다.",
    };
  }
}
