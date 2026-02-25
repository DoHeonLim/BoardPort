/**
 * File Name : features/product/utils/format.ts
 * Description : 검색 파라미터들을 요약 문자열로 변환하는 유틸 함수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created  검색 조건 요약 문자열 생성 유틸 작성
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 * 2026.01.20  임도헌   Modified  gameType 변환 로직 내장(app/(tabs)/products/page에서 format으로 이동)
 * 2026.01.25  임도헌   Modified  주석 보강
 */

import { GAME_TYPE_DISPLAY } from "@/features/product/constants";
/**
 * 검색 파라미터들을 조합하여 요약 문자열을 생성
 * (예: "보드게임, 전략, 추리")
 *
 * @param {string} categoryName - 카테고리 이름 (이미 변환된 값)
 * @param {string} [gameType] - 게임 타입 코드 (BOARD_GAME 등)
 * @param {string} [keyword] - 검색어
 * @returns {string} 콤마로 구분된 요약 문자열
 */
export const formatSearchSummary = (
  categoryName: string,
  gameType?: string,
  keyword?: string
): string => {
  const displayGameType = gameType
    ? GAME_TYPE_DISPLAY[gameType as keyof typeof GAME_TYPE_DISPLAY]
    : undefined;

  return [displayGameType, categoryName, keyword].filter(Boolean).join(", ");
};
