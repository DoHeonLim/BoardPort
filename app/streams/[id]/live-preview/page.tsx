/**
 * File Name : app/streams/[id]/live-preview/page
 * Description : 라이브 미니 프리뷰(iframe 전용) — Broadcast 스키마 + 접근 가드
 * Author : 임도헌
 *
 * History
 * 2025.09.20  임도헌   Modified  LiveInput/Broadcast 스키마 반영
 * 2025.09.23  임도헌   Modified  visibility 가드/언락/팔로워 검사 추가 + 404 대신 블랙 폴백
 * 2026.01.03  임도헌   Modified  PRIVATE 언락 체크에서 session 중복 조회 제거(isBroadcastUnlockedFromSession)
 * 2026.01.04  임도헌   Modified  robots 차단 + revalidate=0 명시 + iframe sandbox/referrerPolicy 보강
 * 2026.01.14  임도헌   Modified  Fallback 배경색 명시 (bg-black)
 */
import Image from "next/image";
import { unstable_noStore as noStore } from "next/cache";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { checkBroadcastAccess } from "@/features/stream/lib/checkBroadcastAccess";
import { isBroadcastUnlockedFromSession } from "@/features/stream/lib/privateUnlockSession";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  robots: { index: false, follow: false },
};

function ThumbnailFallback({ thumbnailUrl }: { thumbnailUrl?: string | null }) {
  return (
    <div className="relative h-screen w-screen bg-black flex items-center justify-center">
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt="Thumbnail"
          fill
          className="object-cover"
          priority
        />
      ) : (
        <div className="text-neutral-500 text-sm">방송 준비 중</div>
      )}
    </div>
  );
}

export default async function LivePreviewPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();

  const broadcastId = Number(params.id);
  if (!Number.isFinite(broadcastId) || broadcastId <= 0) {
    return <ThumbnailFallback />;
  }

  const session = await getSession();
  const viewerId = session?.id ?? null;

  const row = await db.broadcast.findUnique({
    where: { id: broadcastId },
    select: {
      status: true,
      visibility: true,
      thumbnail: true,
      liveInput: {
        select: {
          provider_uid: true,
          userId: true,
        },
      },
    },
  });

  if (!row?.liveInput?.provider_uid)
    return <ThumbnailFallback thumbnailUrl={row?.thumbnail} />;
  if (row.status !== "CONNECTED")
    return <ThumbnailFallback thumbnailUrl={row?.thumbnail} />;

  const ownerId = row.liveInput.userId;
  const isOwner = !!viewerId && viewerId === ownerId;

  if (!isOwner) {
    const isUnlocked = isBroadcastUnlockedFromSession(session, broadcastId);
    const guard = await checkBroadcastAccess(
      { userId: ownerId, visibility: row.visibility },
      viewerId,
      { isPrivateUnlocked: isUnlocked }
    );
    if (!guard.allowed) {
      return <ThumbnailFallback thumbnailUrl={row?.thumbnail} />;
    }
  }

  const DOMAIN = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN;
  if (!DOMAIN) return <ThumbnailFallback thumbnailUrl={row?.thumbnail} />;

  const src = `${DOMAIN.replace(/\/+$/, "")}/${encodeURIComponent(
    row.liveInput.provider_uid
  )}/iframe?autoplay=1&muted=1&preload=auto`;

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden">
      {row.thumbnail && (
        <Image
          src={row.thumbnail}
          alt="Thumbnail"
          fill
          className="object-cover -z-10"
          priority
        />
      )}
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
