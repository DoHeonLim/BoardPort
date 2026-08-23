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
 * 2026.08.23  임도헌   Modified  trusted origin 파싱과 역슬래시·제어문자·다중 인코딩 차단
 */

/**
 * callbackUrl을 안전하게 정제하여 Open Redirect 취약점을 방지
 * 외부 도메인이나 프로토콜이 포함된 URL은 차단하고, 내부 경로만 허용
 *
 * @param {unknown} raw - 검증할 원본 URL
 * @returns {string} 안전한 내부 경로 또는 루트("/")
 */
export function sanitizeCallbackUrl(raw: unknown): string {
  const value = typeof raw === "string" ? raw : "";
  if (!value || value.length > 2048) return "/";

  try {
    // 브라우저 URL 파서는 역슬래시를 슬래시처럼 취급할 수 있으므로 디코딩
    // 전후 모든 단계에서 역슬래시와 제어문자를 먼저 거부한다.
    let decoded = value;
    for (let depth = 0; depth < 3; depth += 1) {
      if (/[\\\u0000-\u001f\u007f]/.test(decoded)) return "/";
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }

    if (/[\\\u0000-\u001f\u007f]/.test(decoded)) return "/";
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/";

    const trustedOrigin = "https://boardport.internal";
    const parsed = new URL(decoded, trustedOrigin);
    if (parsed.origin !== trustedOrigin) return "/";

    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
  } catch {
    return "/";
  }
}
