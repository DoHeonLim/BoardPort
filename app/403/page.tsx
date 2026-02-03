/**
 * File Name : app/403/page.tsx
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
 * 2026.02.02  임도헌   Modified   주석상세 설명 보강
 */

import getSession from "@/lib/session";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import AccessDenied from "@/features/stream/components/AccessDenied";

/**
 * 접근 권한이 부족할 때 리다이렉트되는 페이지입니다.
 *
 * - 스트리밍/방송 진입 시 `PRIVATE`(비공개) 또는 `FOLLOWERS_ONLY`(팔로워 전용) 조건에 걸렸을 때 사용됩니다.
 * - URL 쿼리 파라미터를 통해 거부 사유(`reason`)와 컨텍스트(`streamId`, `ownerId`)를 받습니다.
 * - 클라이언트 컴포넌트 `AccessDenied`를 렌더링하여 비밀번호 입력이나 팔로우 유도 UI를 제공합니다.
 *
 * @param {Object} props - Next.js Page Props
 * @param {Object} props.searchParams - URL 쿼리 파라미터
 * @param {string} [props.searchParams.reason] - 거부 사유 ("PRIVATE" | "FOLLOWERS_ONLY" | "UNKNOWN")
 * @param {string} [props.searchParams.username] - 방송 소유자 닉네임 (표시용)
 * @param {string} [props.searchParams.callbackUrl] - 권한 획득 후 복귀할 URL
 * @param {string} [props.searchParams.sid] - 방송 ID (비밀번호 검증용)
 * @param {string} [props.searchParams.uid] - 방송 소유자 ID (팔로우 요청용)
 */
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
  // (2) sanitize로 한 번만 정리 (보안 강화)
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
