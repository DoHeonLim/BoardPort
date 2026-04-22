/**
 * File Name : app/(app)/(tabs)/profile/[username]/channel/page.tsx
 * Description : 유저 방송국 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
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
 * 2026.01.25  임도헌   Modified  getUserStream를 단일 라이브(getChannelLive)와 녹화본(getChannelVods)으로 분리
 * 2026.01.29  임도헌   Modified  유저 방송국 페이지 주석 보강 및 구조 설명 추가
 * 2026.03.21  임도헌   Modified  owner 전용 채널 소개 수정 액션을 헤더에 주입
 * 2026.03.22  임도헌   Modified  유저 방송국 전용 메타데이터를 추가해 채널 소개와 제목을 페이지 문맥에 맞게 노출
 * 2026.04.09  임도헌   Modified  타인 방송국에도 프로필 페이지와 같은 상단 액션바(뒤로가기, 차단/신고 메뉴) 추가
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/profile/[username]/channel/page.tsx 에서 app/(app)/(tabs)/profile/[username]/channel/page.tsx 로 변경 (라우트 그룹 개편)
*/

import { Metadata } from "next";
import { notFound } from "next/navigation";
import getSession from "@/lib/session";
import BackButton from "@/components/global/BackButton";
import ProfileOptionMenu from "@/features/user/components/profile/ProfileOptionMenu";
import { updateChannelDescriptionAction } from "@/features/user/actions/profile";
import { getUserChannel } from "@/features/user/service/profile";
import UserChannelContainer from "@/features/stream/components/channel";
import RecordingListRefreshRelay from "@/features/stream/components/RecordingListRefreshRelay";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { isBroadcastUnlockedFromSession } from "@/features/stream/utils/session";
import { getChannelLive, getChannelVods } from "@/features/stream/service/list";
import { getViewerRole } from "@/features/stream/service/access";
import { checkBlockRelation } from "@/features/user/service/block";
import type {
  BroadcastSummary,
  ViewerRole,
  VodForGrid,
} from "@/features/stream/types";

// 세션/팔로우 상태에 따라 UI가 달라지는 페이지 → 캐시 강제 비활성화
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const username = decodeURIComponent(params.username);
  const channel = await getUserChannel(username);

  if (!channel) {
    return { title: "방송국을 찾을 수 없음" };
  }

  const description =
    channel.channelDescription?.trim() ||
    `${channel.username}님의 실시간 방송과 다시보기를 확인하세요.`;

  return {
    title: `${channel.username}님의 방송국`,
    description,
    openGraph: {
      title: `${channel.username} - 보드포트 방송국`,
      description,
    },
  };
}

/**
 * 유저 방송국 페이지
 *
 * [기능]
 * 1. 채널 소유자 정보를 확인
 * 2. 현재 라이브 방송 중인지 확인(`getChannelLive`)하고, 지난 녹화본 목록(`getChannelVods`)을 로드
 * 3. 뷰어의 역할(Owner, Follower, Visitor)을 계산
 * 4. 차단 관계를 확인하고 상단 액션바/옵션 메뉴에 필요한 상태를 함께 구성
 * 5. 각 콘텐츠(라이브, VOD)에 대한 접근 권한(Private 언락 여부 등)을 계산하여 주입
 */
export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: { username: string };
  searchParams?: { returnTo?: string };
}) {
  const username = decodeURIComponent(params.username);
  const session = await getSession();
  const viewerId = session?.id ?? null;
  const returnTo = sanitizeCallbackUrl(
    searchParams?.returnTo ?? `/profile/${encodeURIComponent(username)}`
  );

  // 1. 소유자 조회
  const userInfo = await getUserChannel(username);
  if (!userInfo?.id) return notFound();
  const ownerId = userInfo.id;

  // 2. 데이터 병렬 조회 (차단 여부 체크 추가)
  const [liveResult, vods, roleResult, isBlocked] = await Promise.all([
    getChannelLive(ownerId),
    getChannelVods(ownerId, 30),
    getViewerRole(viewerId, ownerId),
    viewerId ? checkBlockRelation(viewerId, ownerId) : Promise.resolve(false),
  ]);

  const resolvedRole = roleResult as ViewerRole;
  const isFollowing = resolvedRole === "OWNER" || resolvedRole === "FOLLOWER";

  // 3. 라이브 스트림 잠금 보정 (PRIVATE)
  let liveStreamForUI: BroadcastSummary | null = null;
  if (liveResult) {
    const s = liveResult;
    const requiresPassword =
      s.visibility === "PRIVATE" &&
      resolvedRole !== "OWNER" &&
      !isBroadcastUnlockedFromSession(session, s.id);

    liveStreamForUI = { ...s, requiresPassword };
  }

  // 4. VOD 목록 잠금 보정 (Controller Layer)
  const recordingsForGrid: VodForGrid[] = vods.map((v) => {
    const isPrivate = v.visibility === "PRIVATE";
    const isFollowers = v.visibility === "FOLLOWERS";

    const unlocked = isPrivate
      ? isBroadcastUnlockedFromSession(session, v.broadcastId)
      : false;

    return {
      ...v,
      requiresPassword: isPrivate && resolvedRole !== "OWNER" && !unlocked,
      followersOnlyLocked:
        isFollowers &&
        !(resolvedRole === "OWNER" || resolvedRole === "FOLLOWER"),
    };
  });

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border-subtle bg-background px-4 py-3 shadow-sm sm:border-none">
        <BackButton
          fallbackHref={returnTo}
          variant="appbar"
          className="border-border-subtle bg-surface px-0 shadow-sm backdrop-blur-none"
        />

        {viewerId && resolvedRole !== "OWNER" && (
          <ProfileOptionMenu
            targetId={userInfo.id}
            username={userInfo.username}
            isBlocked={isBlocked}
          />
        )}
      </div>

      <RecordingListRefreshRelay />
      <UserChannelContainer
        liveNow={liveStreamForUI}
        recordings={recordingsForGrid}
        userInfo={{ ...userInfo, isFollowing, isBlocked }}
        me={resolvedRole === "OWNER"}
        viewerId={viewerId ?? undefined}
        channelDescriptionAction={updateChannelDescriptionAction}
      />
    </>
  );
}

