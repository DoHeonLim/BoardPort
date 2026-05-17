/**
 * File Name : features/common/constants.ts
 * Description : 공통 도메인 상수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.16  임도헌   Created   조회수 중복 증가 방지 쿨다운 상수 분리
 */

/** 동일 유저/대상 기준 조회수 중복 증가 방지 시간 */
export const VIEW_THROTTLE_COOLDOWN_MS = 3 * 60 * 1000;
