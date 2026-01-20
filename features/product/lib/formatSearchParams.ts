/**
 * File Name : features/product/lib/formatSearchParams.ts
 * Description : 검색 파라미터들을 요약 문자열로 변환하는 유틸 함수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created  검색 조건 요약 문자열 생성 유틸 작성
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 */

export const formatSearchSummary = (
  categoryName: string,
  gameType?: string,
  keyword?: string
): string => {
  return [gameType, categoryName, keyword].filter(Boolean).join(", ");
};
