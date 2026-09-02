/**
 * File Name : app/(app)/streams/[id]/live-preview/page.tsx
 * Description : 라이브 미니 프리뷰(iframe 전용) — Broadcast 스키마 + 접근 가드
 * Author : 임도헌
 *
 * History
 * 2025.09.20  임도헌   Modified  LiveInput/Broadcast 스키마 반영
 * 2025.09.23  임도헌   Modified  visibility 가드/언락/팔로워 검사 추가 + 404 대신 블랙 폴백
 * 2026.01.03  임도헌   Modified  PRIVATE 언락 체크에서 session 중복 조회 제거(isBroadcastUnlockedFromSession)
 * 2026.01.04  임도헌   Modified  robots 차단 + revalidate=0 명시 + iframe sandbox/referrerPolicy 보강
 * 2026.01.14  임도헌   Modified  Fallback 배경색 명시 (bg-black)
 * 2026.01.29  임도헌   Modified  주석 설명 보강
 * 2026.04.12  임도헌   Moved     파일 경로를 app/streams/[id]/live-preview/page.tsx 에서 app/(app)/streams/[id]/live-preview/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.08.21  임도헌   Modified  공용 권한 판정 뒤 signed playback token으로만 미리보기 재생
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 * 2026.08.27  임도헌   Modified  전체 화면 미리보기 썸네일의 Image sizes 명시
 * 2026.08.28  임도헌   Modified  미리보기 폴백 컴포넌트 함수 JSDoc 보강
 * 2026.09.02  임도헌   Modified  라이브 플레이어 뒤의 미사용 썸네일 요청 제거 및 폴백 URL 정규화
 */
import Image from "next/image";
import { unstable_noStore as noStore } from "next/cache";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { authorizeBroadcastAccess } from "@/features/stream/service/access";
import {
  createStreamPlaybackToken,
  resolveStreamThumbnailUrl,
} from "@/features/stream/service/playback";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * 라이브 재생 전 또는 접근 불가 상태에 썸네일 폴백을 표시한다.
 *
 * @param props - 표시용으로 정규화된 썸네일 URL
 * @returns 전체 화면 썸네일 또는 방송 준비 안내
 */
function ThumbnailFallback({ thumbnailUrl }: { thumbnailUrl?: string | null }) {
  return (
    <div className="relative h-screen w-screen bg-black flex items-center justify-center">
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt="Thumbnail"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
      ) : (
        <div className="text-neutral-500 text-sm">방송 준비 중</div>
      )}
    </div>
  );
}

/**
 * 라이브 미리보기 페이지 (Iframe Embed용)
 *
 * - 카드 호버 시 로드되는 미니 플레이어
 * - 접근 권한을 체크하여 권한이 없으면 썸네일(Fallback)을 보여줌
 * - Cloudflare Player를 전체 화면으로 렌더링
 */
export default async function LivePreviewPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  noStore();

  const broadcastId = Number(params.id);
  if (!Number.isFinite(broadcastId) || broadcastId <= 0) {
    return <ThumbnailFallback />;
  }

  const session = await getSession();
  const viewerId = session?.id ?? null;
  if (!viewerId) return <ThumbnailFallback />;

  const access = await authorizeBroadcastAccess(broadcastId, viewerId, session);
  if (!access.allowed) return <ThumbnailFallback />;

  // 접근 판정 이후 플레이어 표시용 최소 필드만 조회
  const row = await db.broadcast.findUnique({
    where: { id: broadcastId },
    select: {
      status: true,
      thumbnail: true,
    },
  });

  if (!row) return <ThumbnailFallback />;
  const thumbnailUrl = resolveStreamThumbnailUrl(
    row.thumbnail,
    access.subject.liveInputUid
  );
  if (row.status !== "CONNECTED")
    return <ThumbnailFallback thumbnailUrl={thumbnailUrl} />;

  const DOMAIN = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN;
  if (!DOMAIN) return <ThumbnailFallback thumbnailUrl={thumbnailUrl} />;

  const src = `${DOMAIN.replace(/\/+$/, "")}/${encodeURIComponent(
    createStreamPlaybackToken(access.subject.liveInputUid)
  )}/iframe?autoplay=1&muted=1&preload=auto`;

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden">
      <iframe
        title="Live"
        src={src}
        allow="autoplay; encrypted-media; picture-in-picture; accelerometer; gyroscope"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin allow-scripts allow-presentation allow-popups"
        className="h-full w-full relative z-10"
      />
    </div>
  );
}
