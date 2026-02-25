/**
 * File Name : features/user/utils/badge.ts
 * Description : 뱃지 관련 표시 및 변환 유틸리티
 * Author : 임도헌
 *
 * History
 * 2026.01.30  임도헌   Created (lib/utils.ts에서 이관 및 상수 통합)
 */

import { BADGE_KOREAN_NAMES } from "../constants";

/**
 * 뱃지 영문 코드를 한글 이름으로 변환
 * - features/user/constants.ts의 BADGE_KOREAN_NAMES를 참조
 *
 * @param badgeType - 뱃지 코드 (예: FIRST_DEAL)
 * @returns 한글 뱃지명 (매칭되는 이름이 없으면 코드 그대로 반환)
 */
export function getBadgeKoreanName(badgeType: string): string {
  return BADGE_KOREAN_NAMES[badgeType] || badgeType;
}
