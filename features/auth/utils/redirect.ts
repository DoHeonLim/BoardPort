/**
 * File Name : features/auth/utils/redirect.ts
 * Description : 리다이렉트 URL 보안 검증 유틸 (Open Redirect 방지)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.01  임도헌   Created   외부 URL/이중 인코딩 방지용
 * 2026.01.19  임도헌   Moved     lib/auth -> features/auth/lib
 * 2026.01.21  임도헌   Moved     lib/safeRedirect -> utils/redirect
 * 2026.01.25  임도헌   Modified  주석 보강
 */

/**
 * callbackUrl을 안전하게 정제하여 Open Redirect 취약점을 방지
 * 외부 도메인이나 프로토콜이 포함된 URL은 차단하고, 내부 경로만 허용
 *
 * @param {unknown} raw - 검증할 원본 URL
 * @returns {string} 안전한 내부 경로 또는 루트("/")
 */
export function sanitizeCallbackUrl(raw: unknown): string {
  const val = typeof raw === "string" ? raw : "";
  if (!val) return "/";

  // 1. 외부/절대 URL 및 네트워크 경로 차단
  if (/^https?:\/\//i.test(val)) return "/";
  if (val.startsWith("//")) return "/";
  if (!val.startsWith("/")) return "/";

  try {
    // 2. 이중 인코딩 등을 통한 우회 시도 방지
    const dec = decodeURIComponent(val);
    if (/^https?:\/\//i.test(dec)) return "/";
    if (dec.startsWith("//")) return "/";
    if (!dec.startsWith("/")) return "/";
    return dec || "/";
  } catch {
    return "/";
  }
}
