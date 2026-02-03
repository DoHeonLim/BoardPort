/**
 * File Name : features/user/utils/normalize.ts
 * Description : username 정규화 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.12.12  임도헌   Created   decodeURIComponent 예외 방어 + trim/lowercase/NFC 통일
 * 2026.01.24  임도헌   Moved     lib/normalizeUsername.ts -> utils/normalize.ts
 */

/**
 * username 정규화 규칙
 * - URL 인코딩 입력 방어(decodeURIComponent)
 * - 공백 제거(trim)
 * - 소문자(toLowerCase)
 * - 유니코드 정규화(NFC) (한글 조합형/분해형 이슈 방지)
 *
 * 주의: decodeURIComponent는 malformed 입력에서 throw 할 수 있으므로 try/catch로 방어한다.
 */
export function normalizeUsername(raw: string) {
  const decoded = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();

  return decoded.trim().toLowerCase().normalize("NFC");
}