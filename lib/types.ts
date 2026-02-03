/**
 * File Name : lib/types.ts
 * Description : 공통 type 정의
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.02.02  임도헌   Created   공통 타입 정의
 */

/**
 * [Architecture] 공통 서비스 결과 패턴
 * - 모든 Service 함수의 반환 타입으로 사용됩니다.
 * - 성공 시: { success: true, data?: T }
 * - 실패 시: { success: false, error: string, code?: string }
 */
export type ServiceResult<T = void> =
  | (T extends void ? { success: true; data?: T } : { success: true; data: T })
  | { success: false; error: string; code?: string };
