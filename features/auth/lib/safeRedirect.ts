/**
 * File Name : features/auth/lib/safeRedirect.ts
 * Description : callbackUrl 안전하게 정제하는 유틸
 * Author : 임도헌
 *
 * History
 * 2025.11.01  임도헌   Created   외부 URL/이중 인코딩 방지용
 * 2026.01.19  임도헌   Moved      lib/auth -> features/auth/lib
 */
export function sanitizeCallbackUrl(raw: unknown): string {
  const val = typeof raw === "string" ? raw : "";
  if (!val) return "/";

  // 외부/절대 URL 차단
  if (/^https?:\/\//i.test(val)) return "/";
  // network-path 차단 (//evil.com)
  if (val.startsWith("//")) return "/";
  // 내부 경로만 허용
  if (!val.startsWith("/")) return "/";

  try {
    const dec = decodeURIComponent(val);
    if (/^https?:\/\//i.test(dec)) return "/";
    if (dec.startsWith("//")) return "/";
    if (!dec.startsWith("/")) return "/";
    return dec || "/";
  } catch {
    return "/";
  }
}
