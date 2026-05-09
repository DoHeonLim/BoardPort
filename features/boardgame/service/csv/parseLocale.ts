/**
 * File Name : features/boardgame/service/csv/parseLocale.ts
 * Description : 보드게임 한국어 locale CSV parser
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.29  임도헌   Created   한국어 locale CSV import parser 추가
 * 2026.04.29  임도헌   Modified  PUBLISHED 전환 검수 상태와 검색 키워드 parsing 보강
 * 2026.05.05  임도헌   Modified  한국어 locale 검수 CSV parser 분리
 */

import "server-only";
import { BoardGameLocaleStatus } from "@/generated/prisma/enums";
import {
  parseCsv,
  readLocaleSource,
  readLocaleStatus,
  readNumber,
  readString,
  readStringList,
  toCsvRow,
} from "@/features/boardgame/utils/csv";
import type { ServiceResult } from "@/lib/types";
import type { BoardGameKoreanLocaleImportPayload } from "@/features/boardgame/types/import";

interface BoardGameKoreanLocaleCsvParseResult {
  items: BoardGameKoreanLocaleImportPayload[];
  rowsRead: number;
  skipped: number;
  skippedSamples: string[];
}

/**
 * Google Sheets 등에서 검수한 한국어 locale CSV를 import payload로 변환
 *
 * @param csvText - bggId, koTitle, aliases, shortDescription, searchKeywords, status, sourceType 컬럼이 있는 CSV 원문
 * @returns 정규화된 한국어 locale import 후보
 */
export function parseBoardGameKoreanLocaleCsv(
  csvText: string
): ServiceResult<BoardGameKoreanLocaleCsvParseResult> {
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
    const items: BoardGameKoreanLocaleImportPayload[] = [];
    const seenBggIds = new Set<number>();
    const skippedSamples: string[] = [];
    let skipped = 0;

    for (const rawRow of dataRows) {
      const row = toCsvRow(headers, rawRow);
      const bggId = readNumber(row, ["bggId", "BGGId", "BGG ID"]);
      const title = readString(row, ["koTitle", "title", "한국어 제목"]);
      const status = readLocaleStatus(row);
      const sourceType = readLocaleSource(row);
      const shortDescription = readString(row, [
        "shortDescription",
        "description",
        "짧은 설명",
      ]);

      if (!bggId || !title || seenBggIds.has(bggId) || !status || !sourceType) {
        skipped += 1;
        if (skippedSamples.length < 5) {
          skippedSamples.push(
            title || String(bggId || rawRow[0] || "알 수 없는 행")
          );
        }
        continue;
      }

      // 공개 데이터 품질을 위해 설명 없는 PUBLISHED 행은 import 단계에서 제외
      if (status === BoardGameLocaleStatus.PUBLISHED && !shortDescription) {
        skipped += 1;
        if (skippedSamples.length < 5) skippedSamples.push(title);
        continue;
      }

      seenBggIds.add(bggId);
      items.push({
        bggId,
        title,
        aliases: readStringList(row, ["aliases", "alias", "별칭"]),
        shortDescription,
        searchKeywords: readStringList(row, [
          "searchKeywords",
          "keywords",
          "검색 키워드",
        ]),
        status,
        sourceType,
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
    console.error("[BoardGame Korean Locale CSV Parse Error]", error);
    return {
      success: false,
      error: "한국어 보드게임 CSV를 읽는 중 오류가 발생했습니다.",
    };
  }
}
