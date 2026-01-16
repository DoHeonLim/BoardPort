/**
 * File Name : components/stream/channel/index
 * Description : 유저 방송국 client
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.16  임도헌   Created
 * 2025.05.16  임도헌   Modified  유저 방송국 client 컴포넌트
 * 2025.05.22  임도헌   Modified  팔로우 기능 추가
 * 2025.08.09  임도헌   Modified  기능별 컴포넌트 분리
 * 2025.09.08  임도헌   Modified  useFollowToggle 사용 + viewerId/viewerFollowingIds 전달
 * 2025.09.14  임도헌   Modified  a11y/UX 보강(Esc 닫기, 포커스 관리, 스크롤 잠금, 스크롤 영역 일관화)
 * 2025.09.19  임도헌   Modified  getUserChannel 경량화에 맞춰 팔로워/팔로잉 모달 지연 로드(lazy-load) 적용
 * 2025.09.19  임도헌   Modified  유저 팔로우, 팔로잉 무한스크롤 기능 추가
 * 2025.10.05  임도헌   Modified  follow관련 함수 이름 변경(listFollowers -> fetchFollowers, listFollowing -> fetchFollowing)
 * 2025.10.14  임도헌   Modified  FollowSection 도입: 팔로우/모달/페이지네이션 로직 제거
 * 2026.01.06  임도헌   Modified  팔로우 용어/SSOT 정리: 모달 row는 isFollowedByViewer, 섹션 분리는 isMutualWithOwner(owner 기준)
 * 2025.01.06  임도헌   Modified  LiveNowHero에 onFollow 연결
 * 2026.01.14  임도헌   Modified  [Refactor] UserStreamsClient -> index.tsx, 시맨틱 토큰 적용
 */
"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import UserChannelHeader from "./UserChannelHeader";
import LiveNowHero from "./LiveNowHero";
import RecordingGrid from "./RecordingGrid";

import type { BroadcastSummary, ViewerRole, VodForGrid } from "@/types/stream";

type ExtendedUserInfo = {
  id: number;
  username: string;
  avatar?: string | null;
  isFollowing?: boolean;
  _count?: { followers?: number; following?: number };
};

type MeProp = boolean | { id: number } | undefined;

export default function UserChannelContainer({
  userStreams,
  recordings,
  liveNow,
  userInfo,
  me,
  viewerId,
}: {
  userStreams?: BroadcastSummary[];
  recordings?: VodForGrid[];
  liveNow?: BroadcastSummary | null;
  userInfo: ExtendedUserInfo;
  me?: MeProp;
  viewerId?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const next = useMemo(
    () => pathname + (searchParams.size ? `?${searchParams.toString()}` : ""),
    [pathname, searchParams]
  );

  // 본인 여부 및 팔로우 상태(초기값)
  const isMe =
    typeof me === "boolean"
      ? me
      : !!(me && "id" in me && me.id === userInfo.id);

  const [isFollowing, setIsFollowing] = useState<boolean>(
    !!userInfo.isFollowing
  );
  // 채널용 역할 계산 (isFollowing이 바뀌면 재계산)
  const role: ViewerRole = isMe
    ? "OWNER"
    : isFollowing
      ? "FOLLOWER"
      : "VISITOR";

  const liveStream = useMemo<BroadcastSummary | undefined>(() => {
    if (liveNow) return liveNow || undefined;
    if (Array.isArray(userStreams))
      return userStreams.find((s) => s.status === "CONNECTED");
    return undefined;
  }, [liveNow, userStreams]);

  const recordingsMemo = useMemo(() => recordings ?? [], [recordings]);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 transition-colors">
      {/* Header */}
      <UserChannelHeader
        ownerId={userInfo.id}
        username={userInfo.username}
        avatar={userInfo.avatar}
        initialFollowerCount={userInfo._count?.followers ?? 0}
        initialFollowingCount={userInfo._count?.following ?? 0}
        initialIsFollowing={!!userInfo.isFollowing}
        isMe={isMe}
        viewerId={viewerId}
        onRequireLogin={() =>
          router.push(`/login?callbackUrl=${encodeURIComponent(next)}`)
        }
        onFollowingChange={setIsFollowing}
      />

      <div className="space-y-8">
        {/* Live Section */}
        <LiveNowHero
          stream={liveStream}
          role={role}
          onFollow={() => {
            const btn = document.getElementById("channel-follow-button");
            if (btn) {
              btn.scrollIntoView({ behavior: "smooth", block: "center" });
              btn.focus();
            } else {
              // fallback
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        />

        {/* VOD Section */}
        <RecordingGrid
          recordings={recordingsMemo}
          role={role}
          isFollowing={isFollowing}
        />
      </div>
    </div>
  );
}
