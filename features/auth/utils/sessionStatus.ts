/**
 * File Name : features/auth/utils/sessionStatus.ts
 * Description : 브라우저 세션의 최신 이용 정지 상태 동기화 유틸리티
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.04  임도헌   Created   Realtime 이벤트 유실 시 서버 상태 기반 정지 화면 복구 지원
 */

export interface ClientSessionStatus {
  banned: boolean;
  bannedUntil: string | null;
}

/** 서버 세션을 DB 최신 상태로 갱신하고 현재 유효한 정지 여부 반환 */
export async function refreshClientSessionStatus(
  signal?: AbortSignal
): Promise<ClientSessionStatus | null> {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) return null;

  const body = (await response.json().catch(() => null)) as {
    banned?: unknown;
    bannedUntil?: unknown;
  } | null;

  if (!body || typeof body.banned !== "boolean") return null;

  return {
    banned: body.banned,
    bannedUntil: typeof body.bannedUntil === "string" ? body.bannedUntil : null,
  };
}

/** 정지 안내 페이지의 내부 URL 생성 */
export function buildBannedRedirectHref(reason?: string) {
  const bannedUrl = new URL("/403", window.location.origin);
  bannedUrl.searchParams.set("reason", "BANNED");
  if (reason?.trim()) {
    bannedUrl.searchParams.set("banReason", reason.trim());
  }
  return bannedUrl.href;
}

/** 브라우저 기록에 현재 화면을 남기지 않고 정지 안내 페이지로 전환 */
export function redirectToBannedPage(reason?: string) {
  window.location.replace(buildBannedRedirectHref(reason));
}
