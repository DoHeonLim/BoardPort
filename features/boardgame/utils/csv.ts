/**
 * File Name : features/boardgame/utils/csv.ts
 * Description : 보드게임 CSV import 공통 파서/reader
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   quoted field 대응 CSV parser와 공통 column reader 분리
 */

import {
  BoardGameLocaleSource,
  BoardGameLocaleStatus,
  BoardGameTaxonomyType,
} from "@/generated/prisma/enums";
import type { BoardGameTaxonomyItem } from "@/features/boardgame/types/import";

export type CsvRow = {
  entries: Array<{ header: string; normalizedHeader: string; value: string }>;
  values: Map<string, string>;
};

/**
 * quoted field, comma, line break를 고려한 CSV 문자열 row 배열 파싱
 *
 * @param csvText - CSV 원문
 * @returns header와 data row를 포함한 2차원 문자열 배열
 */
export function parseCsv(csvText: string): string[][] {
  // Kaggle CSV는 Description처럼 쉼표와 줄바꿈이 들어간 quoted field가 있어 단순 split을 쓰지 않음
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);

  return rows;
}

/**
 * CSV header와 raw row의 alias 검색용 row 객체 변환
 *
 * @param headers - 원본 CSV header 배열
 * @param rawRow - CSV data row
 * @returns 원본 header 정보와 정규화 header map을 함께 가진 row
 */
export function toCsvRow(headers: string[], rawRow: string[]): CsvRow {
  const entries = headers.map((header, index) => ({
    header,
    normalizedHeader: normalizeHeader(header),
    value: rawRow[index]?.trim() ?? "",
  }));
  return {
    entries,
    values: new Map(
      entries.map((entry) => [entry.normalizedHeader, entry.value])
    ),
  };
}

/**
 * 여러 header alias 중 첫 번째 문자열 값 조회
 *
 * @param row - 정규화된 CSV row
 * @param aliases - 허용할 header alias 목록
 * @returns trim 처리된 문자열 값 또는 null
 */
export function readString(row: CsvRow, aliases: string[]): string | null {
  for (const alias of aliases) {
    const value = row.values.get(normalizeHeader(alias));
    if (value) return value.trim();
  }
  return null;
}

/**
 * CSV 문자열 값의 숫자 변환
 *
 * @param row - 정규화된 CSV row
 * @param aliases - 허용할 header alias 목록
 * @returns 유효한 숫자 또는 null
 */
export function readNumber(row: CsvRow, aliases: string[]): number | null {
  const value = readString(row, aliases);
  if (!value) return null;

  const normalized = value.replace(/,/g, "");
  if (!normalized || normalized.toUpperCase() === "N/A") return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * CSV boolean 계열 값의 boolean 변환
 *
 * @param row - 정규화된 CSV row
 * @param aliases - 허용할 header alias 목록
 * @returns true/false 또는 판별 불가 시 null
 */
export function readBoolean(row: CsvRow, aliases: string[]): boolean | null {
  const value = readString(row, aliases);
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) return true;
  if (["0", "false", "no", "n"].includes(normalized)) return false;

  const numericValue = Number(normalized);
  if (Number.isFinite(numericValue)) {
    if (numericValue === 1) return true;
    if (numericValue === 0) return false;
  }

  return null;
}

/**
 * CSV list 문자열의 중복 제거 문자열 배열 변환
 *
 * @param row - 정규화된 CSV row
 * @param aliases - 허용할 header alias 목록
 * @returns 구분자와 불필요한 quote/bracket을 정리한 문자열 배열
 */
export function readStringList(row: CsvRow, aliases: string[]): string[] {
  const value = readString(row, aliases);
  if (!value) return [];

  return Array.from(
    new Set(
      value
        .replace(/^\[/, "")
        .replace(/\]$/, "")
        .replace(/'/g, "")
        .split(/[;|,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

/**
 * locale 공개 상태 컬럼의 Prisma enum 값 변환
 *
 * @param row - 정규화된 CSV row
 * @returns 허용된 locale 상태, 빈 값이면 DRAFT
 */
export function readLocaleStatus(row: CsvRow): BoardGameLocaleStatus | null {
  const value = readString(row, ["status", "공개 상태"]);
  if (!value) return BoardGameLocaleStatus.DRAFT;

  const normalized = value.trim().toUpperCase();
  return Object.values(BoardGameLocaleStatus).includes(
    normalized as BoardGameLocaleStatus
  )
    ? (normalized as BoardGameLocaleStatus)
    : null;
}

/**
 * locale 작성 출처 컬럼의 Prisma enum 값 변환
 *
 * @param row - 정규화된 CSV row
 * @returns 허용된 source type, 빈 값이면 ADMIN
 */
export function readLocaleSource(row: CsvRow): BoardGameLocaleSource | null {
  const value = readString(row, ["sourceType", "source", "출처 유형"]);
  if (!value) return BoardGameLocaleSource.ADMIN;

  const normalized = value.trim().toUpperCase();
  return Object.values(BoardGameLocaleSource).includes(
    normalized as BoardGameLocaleSource
  )
    ? (normalized as BoardGameLocaleSource)
    : null;
}

/**
 * taxonomy type 컬럼의 CATEGORY/MECHANIC enum 변환
 *
 * @param row - 정규화된 CSV row
 * @returns 허용된 taxonomy type 또는 null
 */
export function readTaxonomyType(row: CsvRow): BoardGameTaxonomyType | null {
  const value = readString(row, ["type", "taxonomyType", "분류 유형"]);
  if (!value) return null;

  const normalized = value.trim().toUpperCase();
  if (normalized === "CATEGORY" || normalized === "CATEGORIES") {
    return BoardGameTaxonomyType.CATEGORY;
  }
  if (normalized === "MECHANIC" || normalized === "MECHANICS") {
    return BoardGameTaxonomyType.MECHANIC;
  }

  return Object.values(BoardGameTaxonomyType).includes(
    normalized as BoardGameTaxonomyType
  )
    ? (normalized as BoardGameTaxonomyType)
    : null;
}

/**
 * URL 컬럼의 http/https 절대 URL 정규화
 *
 * @param row - 정규화된 CSV row
 * @param aliases - 허용할 header alias 목록
 * @returns 사용할 수 있는 URL 또는 null
 */
export function readUrl(row: CsvRow, aliases: string[]): string | null {
  const value = readString(row, aliases);
  if (!value) return null;
  if (value.startsWith("https://") || value.startsWith("http://")) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return null;
}

/**
 * 직접 목록 컬럼과 Cat:/Mechanic: prefix 컬럼 기반 taxonomy 후보 생성
 *
 * @param row - 정규화된 CSV row
 * @param directAliases - taxonomy 목록이 직접 들어있는 컬럼 alias
 * @param prefixes - truthy flag 컬럼에서 taxonomy 이름을 잘라낼 prefix 목록
 * @returns 중복 제거된 taxonomy item 목록
 */
export function readTaxonomies(
  row: CsvRow,
  directAliases: string[],
  prefixes: string[]
): BoardGameTaxonomyItem[] {
  const names = new Set<string>();
  const directValue = readString(row, directAliases);

  if (directValue) {
    directValue
      .split(/[;|,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => names.add(item));
  }

  row.entries.forEach((entry) => {
    const matchedPrefix = prefixes.find((prefix) =>
      entry.header.toLowerCase().startsWith(prefix.toLowerCase())
    );
    if (!matchedPrefix || !isTruthyCsvFlag(entry.value)) return;

    const taxonomyName = entry.header.slice(matchedPrefix.length).trim();
    if (taxonomyName) names.add(taxonomyName);
  });

  return Array.from(names).map((name) => ({ name }));
}

/**
 * CSV flag 값을 true로 볼 수 있는지 판별
 *
 * @param value - CSV flag 원문
 * @returns true로 해석 가능한 값 여부
 */
export function isTruthyCsvFlag(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

/**
 * header alias 비교를 위한 영문/숫자 key 정규화
 *
 * @param value - CSV header 또는 alias
 * @returns 비교용 header key
 */
function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
