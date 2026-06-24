/**
 * File Name : features/boardgame/utils/importHelpers.ts
 * Description : 보드게임 관리자 import 공통 helper
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   CSV 저장 청크, 문자열 배열 정규화, taxonomy slug helper 분리
 */

/**
 * 대량 CSV 저장을 Prisma transaction timeout 안에서 처리하기 위한 고정 크기 청크 생성
 *
 * @param items - 처리할 항목 목록
 * @param size - 청크당 항목 수
 * @returns 입력 목록을 순서대로 나눈 청크 배열
 */
export function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/**
 * CSV/폼에서 들어온 문자열 배열의 trim, 빈 값 제거, 중복 제거 정리
 *
 * @param items - 정규화할 문자열 배열
 * @returns 표시/검색에 사용할 수 있는 문자열 배열
 */
export function normalizeStringList(items: string[] | undefined): string[] {
  return Array.from(
    new Set((items ?? []).map((item) => item.trim()).filter(Boolean))
  );
}

/**
 * BGG taxonomy 원문명의 URL/DB lookup용 slug 변환
 *
 * @param value - BGG category 또는 mechanic 원문명
 * @returns 소문자 kebab-case slug
 */
export function slugifyTaxonomy(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
