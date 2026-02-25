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
 * 2026.02.08  임도헌   Modified   정지된 유저(BANNED)일 경우 사유 및 기간 조회 로직 추가
 * 2026.02.20  임도헌   Modified   미들웨어 데드락 방지: 403 페이지에서 정지 만료 시 자동 세션 복구 및 홈으로 구출
 */

import { redirect } from "next/navigation";
import getSession from "@/lib/session";
import db from "@/lib/db";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import AccessDenied from "@/components/global/AccessDenied";
import { getUserBanDetails } from "@/features/user/service/ban";

/**
 * 접근 권한이 부족할 때 리다이렉트되는 페이지
 *
 * - 스트리밍/방송 진입 시 `PRIVATE`(비공개) 또는 `FOLLOWERS_ONLY`(팔로워 전용) 조건에 걸렸을 때 사용
 * - URL 쿼리 파라미터를 통해 거부 사유(`reason`)와 컨텍스트(`streamId`, `ownerId`)를 받음
 * - 클라이언트 컴포넌트 `AccessDenied`를 렌더링하여 비밀번호 입력이나 팔로우 유도 UI를 제공
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
    reason?: "PRIVATE" | "FOLLOWERS_ONLY" | "BLOCKED" | "BANNED" | "UNKNOWN";
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

  // sanitize로 한 번만 정리 (보안 강화)
  const callbackUrl = sanitizeCallbackUrl(searchParams.callbackUrl ?? "/");

  const sid = Number(searchParams.sid ?? 0);
  const uid = Number(searchParams.uid ?? 0);

  let banDetails = null;
  if (reason === "BANNED" && viewerId) {
    banDetails = await getUserBanDetails(viewerId);
  }

  // BANNED 상태인 경우, DB를 확인하여 만료되었는지 체크 (미들웨어 데드락 구출)
  if (reason === "BANNED" && viewerId) {
    const user = await db.user.findUnique({
      where: { id: viewerId },
      select: { bannedAt: true, bannedUntil: true },
    });

    if (user?.bannedAt && user.bannedUntil && new Date() > user.bannedUntil) {
      // 1. DB 정지 해제
      await db.user.update({
        where: { id: viewerId },
        data: { bannedAt: null, bannedUntil: null },
      });
      // 2. 세션(쿠키) 복구
      session.banned = false;
      await session.save();
      // 3. 데드락 구출 (홈으로 리다이렉트)
      redirect("/");
    }

    // 아직 정지 중인 경우 사유 표시
    banDetails = await getUserBanDetails(viewerId);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <AccessDenied
        reason={reason}
        username={username}
        callbackUrl={callbackUrl}
        streamId={Number.isFinite(sid) ? sid : undefined}
        ownerId={Number.isFinite(uid) ? uid : undefined}
        viewerId={viewerId}
        banDetails={banDetails}
      />
    </div>
  );
}
