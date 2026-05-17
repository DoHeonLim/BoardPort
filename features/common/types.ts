/**
 * File Name : features/common/types.ts
 * Description : 공통 도메인 타입 정의
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.16  임도헌   Created   조회수 증가 서비스 입력 타입 분리
 */

/** 조회수 증가 대상 타입 */
export type IncrementViewsTarget = "PRODUCT" | "POST" | "VOD";

/** 조회수 증가 서비스 입력값 */
export interface IncrementViewsArgs {
  target: IncrementViewsTarget;
  targetId: number;
  viewerId: number | null;
}
