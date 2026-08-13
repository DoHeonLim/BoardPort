/**
 * File Name : features/auth/utils/email.ts
 * Description : 인증 도메인 이메일 정규화 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.07.31  임도헌   Created   선택 이메일의 trim·소문자·null 정규화 기준 추가
 */

/**
 * 선택 이메일을 DB 저장·조회에 사용할 canonical 값으로 정규화
 *
 * @param email - 선택 입력 또는 OAuth provider가 반환한 이메일
 * @returns trim·소문자 처리된 이메일, 빈 값이면 null
 */
export function normalizeOptionalEmail(
  email: string | null | undefined
): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}
