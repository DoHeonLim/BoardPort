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
 * [Architecture] 서비스 레이어 성공 결과
 * - 단순 성공/실패만 필요한 Service 함수의 기본 성공 타입
 * - data가 필요한 경우에만 명시적으로 포함한다.
 */
export type ServiceSuccess<T = void> = [T] extends [void]
  ? { success: true }
  : { success: true; data: T };

/**
 * [Architecture] 서비스 레이어 실패 결과
 * - error: 사용자 노출 가능한 실패 메시지
 * - code: UI 분기 또는 액션 매핑에 사용하는 선택적 에러 코드
 */
export type ServiceFailure<Code extends string = string> = {
  success: false;
  error: string;
  code?: Code;
};

/**
 * [Architecture] 공통 서비스 결과 패턴
 * - 단순 성공/실패 구조를 따르는 Service 함수의 기본 반환 타입
 * - 폼 필드 에러, 다단계 상태, 도메인 전용 메타데이터가 필요한 경우에는
 *   각 도메인(types.ts)에서 별도 Result Union을 정의한다.
 */
export type ServiceResult<T = void, Code extends string = string> =
  | ServiceSuccess<T>
  | ServiceFailure<Code>;
