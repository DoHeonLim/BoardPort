/**
 * File Name : features/search/utils/keyword.ts
 * Description : 검색 키워드 보조 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.02  임도헌   Created   검색 기록 저장/삭제 기준과 동일한 키워드 정규화 유틸 분리
 * 2026.04.04  임도헌   Modified  검색 키워드 정규화 유틸 설명 보강
 */

/** 검색어 정규화 유틸 */
export function normalizeSearchKeyword(keyword: string): string {
  return keyword.trim().toLowerCase();
}
