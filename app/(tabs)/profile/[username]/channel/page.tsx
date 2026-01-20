/**
 * File Name : app/(tabs)/profile/[username]/channel/page
 * Description : 유저 방송국 페이지
 * Author : 임도헌
 *
 * History
 * 2025.05.16  임도헌   Created
 * 2025.08.09  임도헌   Modified  getUserStreams + role 적용(가시성 필터 적용)
 * 2025.08.26  임도헌   Modified  녹화본 requiresPassword/followersOnlyLocked 서버 계산 적용
 * 2025.08.27  임도헌   Modified  언락 상태 기반 requiresPassword 계산 + recordings 주입
 * 2025.08.27  임도헌   Modified  getUserStreams 결과에서 ENDED만 골라 간단 플래그 계산
 * 2025.09.08  임도헌   Modified  viewerFollowingIds 조회 후 클라이언트로 전달
 * 2025.09.12  임도헌   Modified  병렬화 및 소소한 타입/가드 정리
 * 2025.09.13  임도헌   Modified  unstable_cache 태그 적용 — 라이브 상태 갱신 전파
 * 2025.09.17  임도헌   Modified  캐시 태그 표준화(broadcast-list), VodAsset 단일 페이지 진입 반영
 * 2025.09.19  임도헌   Modified  getUserChannel 도입(리다이렉트 제거)
 * 2025.09.21  임도헌   Modified  모든 VOD 전개 + vodId 경로 주입
 * 2025.10.06  임도헌   Modified  BroadcastSummary 타입 단언 수정
 * 2025.11.22  임도헌   Modified  viewerRole 기반 isFollowing 유도, getIsFollowing 제거,
 *                                dynamic 적용(개인화 페이지 캐시 회피)
 * 2026.01.06  임도헌   Modified  VOD 조회 상한(MAX_VODS) + endedIds 상한(MAX_STREAMS) 적용,
 *                                PRIVATE 언락 세션 기반 requiresPassword 보정(채널/그리드 일관성)
 */

import { notFound } from "next/navigation";
import getSession from "@/lib/session";
import db from "@/lib/db";
import UserChannelContainer from "@/features/stream/components/channel";
import { getUserStreams } from "@/features/stream/lib/getUserStreams";
import { getUserChannel } from "@/features/user/lib/getUserChannel";
import { isBroadcastUnlockedFromSession } from "@/features/stream/lib/privateUnlockSession";
import type { BroadcastSummary, ViewerRole, VodForGrid } from "@/types/stream";

type Params = { username: string };

// 세션/팔로우 상태에 따라 UI가 달라지는 페이지 → 캐시 강제 비활성화
export const dynamic = "force-dynamic";

const MAX_STREAMS = 30; // 채널에서 보여줄 스트림 상한(기존 take 유지)
const MAX_VODS = 30; // VOD 그리드 조회 상한(쿼리 비용 상한)

export default async function ChannelPage({ params }: { params: Params }) {
  const username = decodeURIComponent(params.username);
  const session = await getSession();
  const viewerId = session?.id ?? null;

  // 1) 채널 소유자
  const userInfo = await getUserChannel(username);
  if (!userInfo?.id) return notFound();

  const ownerId = userInfo.id;

  // 2) 방송 목록 + 뷰어 역할
  const streamsWithRole = await getUserStreams({
    ownerId,
    viewerId,
    take: MAX_STREAMS,
    // 채널은 FOLLOWERS/PRIVATE 락 표시가 정확해야 해서 role 계산 유지
    includeViewerRole: true,
  });

  const { items: userStreams = [], role = "VISITOR" } = streamsWithRole ?? {};
  const resolvedRole = role as ViewerRole;

  // ROLE → isFollowing 유도 (OWNER/FOLLOWER = true, VISITOR = false)
  const isFollowing = resolvedRole === "OWNER" || resolvedRole === "FOLLOWER";
  const streams: BroadcastSummary[] = userStreams ?? [];

  // 2-1) PRIVATE 언락 보정(뒤로가기/복원 시에도 잠금 즉시 해제 표시)
  // - PRIVATE는 팔로우로 풀리지 않음 → 세션 언락 상태를 반드시 반영해야 함
  // - OWNER는 항상 잠금 해제
  const streamsForUI: BroadcastSummary[] = streams.map((s) => {
    if (s.visibility !== "PRIVATE") return s;
    if (resolvedRole === "OWNER") return { ...s, requiresPassword: false };

    const unlocked = isBroadcastUnlockedFromSession(session, s.id);
    return { ...s, requiresPassword: !unlocked };
  });

  // 3) ENDED 방송들의 VOD 조회 → 평탄화
  // - ENDED 후보는 최근 MAX_STREAMS개로 상한
  // - VOD 조회는 MAX_VODS로 상한 (force-dynamic 트래픽 비용 방어)
  const endedBroadcastsAll = streamsForUI
    .filter((s) => s.status === "ENDED")
    // getUserStreams가 id desc라면 사실상 필요 없지만, 미래 변경 내성을 위해 안전하게 보정
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

  const endedBroadcasts = endedBroadcastsAll.slice(0, MAX_STREAMS);
  const endedIds = endedBroadcasts.map((s) => s.id);

  let recordingsForGrid: VodForGrid[] = [];

  if (endedIds.length > 0) {
    const vods = await db.vodAsset.findMany({
      where: { broadcastId: { in: endedIds } },
      select: {
        id: true,
        broadcastId: true,
        thumbnail_url: true,
        duration_sec: true,
        ready_at: true,
        views: true,
        created_at: true,
      },
      orderBy: [{ ready_at: "desc" }, { created_at: "desc" }],
      take: MAX_VODS,
    });

    const byBroadcast = new Map<number, BroadcastSummary>();
    for (const s of endedBroadcasts) byBroadcast.set(s.id, s);

    recordingsForGrid = vods
      .map((v) => {
        const rec = byBroadcast.get(v.broadcastId);
        if (!rec) return null;

        const isFollowersOnly = rec.visibility === "FOLLOWERS";

        // VOD 그리드에서도 PRIVATE 언락(세션) 반영
        const isPrivate = rec.visibility === "PRIVATE";
        const unlocked = isPrivate
          ? isBroadcastUnlockedFromSession(session, rec.id)
          : false;

        const requiresPassword =
          isPrivate && resolvedRole !== "OWNER" && !unlocked;

        const followersOnlyLocked =
          isFollowersOnly &&
          !(resolvedRole === "OWNER" || resolvedRole === "FOLLOWER");

        return {
          vodId: v.id,
          broadcastId: v.broadcastId,
          title: rec.title,
          thumbnail: v.thumbnail_url ?? rec.thumbnail,
          visibility: rec.visibility,
          user: rec.user,
          href: `/streams/${v.id}/recording`,
          readyAt: v.ready_at ?? null,
          duration:
            typeof v.duration_sec === "number" ? v.duration_sec : undefined,
          viewCount: v.views ?? 0,
          requiresPassword,
          followersOnlyLocked,
        } satisfies VodForGrid;
      })
      .filter(Boolean) as VodForGrid[];
  }

  return (
    <UserChannelContainer
      userStreams={streamsForUI}
      recordings={recordingsForGrid}
      userInfo={{ ...userInfo, isFollowing }}
      me={resolvedRole === "OWNER"}
      viewerId={viewerId ?? undefined}
    />
  );
}
