/**
 * File Name : app/403/page
 * Description : 접근 권한 거부 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.08.09  임도헌   Created    403 전용 페이지
 * 2025.09.06  임도헌   Modified   reason/username/next/sid에 따라 CTA 제공 (비번 언락 지원)
 * 2025.11.01  임도헌   Modified   next → callbackUrl 통일
 * 2025.12.09  임도헌   Modified   sanitize 적용
 * 2026.01.13  임도헌   Modified   컴포넌트명 변경 반영 (AccessDeniedClient -> AccessDenied)
 */

import AccessDenied from "@/components/stream/AccessDenied";
import { sanitizeCallbackUrl } from "@/lib/auth/safeRedirect";
import getSession from "@/lib/session";

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: {
    reason?: "PRIVATE" | "FOLLOWERS_ONLY" | "UNKNOWN";
    username?: string;
    callbackUrl?: string; // 신규 표준
    sid?: string; // stream id
    uid?: string; // 방송 소유자 id
  };
}) {
  const session = await getSession();
  const viewerId = session?.id ?? null;

  const reason = searchParams.reason ?? "UNKNOWN";
  const username = searchParams.username ?? "unknown";
  // (1) raw 값을 먼저 결정
  const rawCallbackUrl = searchParams.callbackUrl ?? "/";
  // (2) sanitize로 한 번만 정리
  const callbackUrl = sanitizeCallbackUrl(rawCallbackUrl);

  const sid = Number(searchParams.sid ?? 0);
  const uid = Number(searchParams.uid ?? 0);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <AccessDenied
        reason={reason}
        username={username}
        callbackUrl={callbackUrl}
        streamId={Number.isFinite(sid) ? sid : undefined}
        ownerId={Number.isFinite(uid) ? uid : undefined}
        viewerId={viewerId}
      />
    </div>
  );
}
