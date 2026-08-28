/**
 * File Name : features/stream/components/channel/index.tsx
 * Description : 유저 방송국(채널) 메인 컨테이너
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
 * 2026.01.06  임도헌   Modified  LiveNowHero에 onFollow 연결
 * 2026.01.14  임도헌   Modified  [Refactor] UserStreamsClient -> index.tsx, 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.15  임도헌   Modified  차단 상태 빈 화면의 시스템 이모지를 heroicons 기반 아이콘으로 교체
 * 2026.03.18  임도헌   Modified  로그인 복귀용 현재 채널 경로도 내부 경로 기준으로 정규화해 nested callbackUrl 예외를 완화
 * 2026.03.21  임도헌   Modified  User.channelDescription을 채널 헤더로 전달해 하드코딩 소개 문구를 제거
 * 2026.03.21  임도헌   Modified  owner 전용 채널 소개 수정 액션을 헤더로 전달
 * 2026.03.21  임도헌   Modified  다시보기 빈 상태/팔로워 잠금 CTA도 채널 헤더 팔로우 버튼으로 유도되도록 onFollow 경로를 통일
 * 2026.03.23  임도헌   Modified  채널 차단 안내 empty state의 점선 카드 보더를 구조 구분용 subtle 기준으로 정리
 * 2026.03.25  임도헌   Modified  프로필 메인과 탭바 하단 간격을 맞추기 위해 채널 페이지 bottom padding을 통일
 * 2026.05.15  임도헌   Modified  채널 다시보기 무한스크롤용 첫 페이지 커서 전달
 * 2026.08.13  임도헌   Modified  채널 다시보기 목록에 현재 조회자 ID 전달
 * 2026.08.27  임도헌   Modified  모션 축소 설정에 따라 팔로우 CTA 스크롤 동작 조정
 * ===============================================================================================
 * User Channel (방송국) 페이지를 구성하는 UI 요소들을 분리해 모아둔 디렉토리
 * - UserChannelHeader.tsx : 채널 헤더 (프로필, 팔로우 버튼, 채널 소개/owner 편집)
 * - LiveNowHero.tsx       : 현재 진행 중인 라이브 방송 (최상단 노출)
 * - RecordingGrid.tsx     : 지난 방송(녹화본) 목록 그리드
 * - RecordingEmptyState.tsx : 녹화본이 없을 때 빈 상태 UI
 * - index.tsx             : 위 컴포넌트들을 조합한 최종 채널 페이지 컨테이너
 * ===============================================================================================
 */
"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NoSymbolIcon } from "@heroicons/react/24/outline";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { getMotionSafeScrollBehavior } from "@/lib/accessibility";
import UserChannelHeader from "@/features/stream/components/channel/UserChannelHeader";
import LiveNowHero from "@/features/stream/components/channel/LiveNowHero";
import RecordingGrid from "@/features/stream/components/channel/RecordingGrid";
import type { ChannelDescriptionActionState } from "@/features/user/types";
import type {
  BroadcastSummary,
  ViewerRole,
  VodForGrid,
} from "@/features/stream/types";

type ExtendedUserInfo = {
  id: number;
  username: string;
  avatar?: string | null;
  channelDescription?: string | null;
  isFollowing?: boolean;
  isBlocked?: boolean;
  _count?: { followers?: number; following?: number };
};

type MeProp = boolean | { id: number } | undefined;
type ChannelDescriptionAction = (
  formData: FormData
) => Promise<ChannelDescriptionActionState>;

/**
 * 유저 방송국 페이지 컨테이너
 *
 * [구조]
 * 1. 헤더: 유저 정보 및 팔로우 액션
 * 2. 라이브 히어로: 현재 진행 중인 방송이 있다면 최상단에 크게 표시
 * 3. 녹화본 그리드: 지난 방송 목록
 *
 * [기능]
 * - 팔로우 상태를 로컬 state로 관리하여 즉각적인 UI 반응성을 제공
 * - 로그인되지 않은 경우 로그인 페이지로 리다이렉트하는 콜백을 헤더에 전달
 */
export default function UserChannelContainer({
  liveNow,
  recordings,
  recordingsNextCursor = null,
  userInfo,
  me,
  viewerId,
  channelDescriptionAction,
}: {
  liveNow?: BroadcastSummary | null;
  recordings?: VodForGrid[];
  recordingsNextCursor?: number | null;
  userInfo: ExtendedUserInfo;
  me?: MeProp;
  viewerId?: number;
  channelDescriptionAction?: ChannelDescriptionAction;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const next = useMemo(
    () =>
      sanitizeCallbackUrl(
        pathname + (searchParams.size ? `?${searchParams.toString()}` : "")
      ),
    [pathname, searchParams]
  );

  const isMe =
    typeof me === "boolean"
      ? me
      : !!(me && "id" in me && me.id === userInfo.id);

  const [isFollowing, setIsFollowing] = useState<boolean>(
    !!userInfo.isFollowing
  );

  // 현재 뷰어의 역할 계산 (Owner / Follower / Visitor)
  const role: ViewerRole = isMe
    ? "OWNER"
    : isFollowing
      ? "FOLLOWER"
      : "VISITOR";

  const liveStream = useMemo<BroadcastSummary | undefined>(() => {
    if (liveNow) return liveNow || undefined;
  }, [liveNow]);

  const recordingsMemo = useMemo(() => recordings ?? [], [recordings]);

  /**
   * 채널 내 팔로우 유도 CTA 클릭 시 헤더 팔로우 버튼으로 자연스러운 이동 유도
   * - 라이브 히어로, 다시보기 empty state, 팔로워 잠금 카드가 같은 진입점을 공유
   */
  const focusFollowButton = () => {
    const btn = document.getElementById("channel-follow-button");
    if (btn) {
      btn.scrollIntoView({
        behavior: getMotionSafeScrollBehavior(),
        block: "center",
      });
      btn.focus();
      return;
    }

    window.scrollTo({ top: 0, behavior: getMotionSafeScrollBehavior() });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 transition-colors">
      <UserChannelHeader
        ownerId={userInfo.id}
        username={userInfo.username}
        avatar={userInfo.avatar}
        channelDescription={userInfo.channelDescription}
        initialFollowerCount={userInfo._count?.followers ?? 0}
        initialFollowingCount={userInfo._count?.following ?? 0}
        initialIsFollowing={!!userInfo.isFollowing}
        isMe={isMe}
        isBlocked={userInfo.isBlocked}
        viewerId={viewerId}
        channelDescriptionAction={channelDescriptionAction}
        onRequireLogin={() =>
          router.push(`/login?callbackUrl=${encodeURIComponent(next)}`)
        }
        onFollowingChange={setIsFollowing}
      />

      {userInfo.isBlocked ? (
        <div className="mx-auto max-w-3xl w-full px-4 py-12">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle bg-surface-dim px-4 py-20 text-center">
            <NoSymbolIcon className="mb-4 size-10 text-danger" />
            <p className="text-lg font-bold text-primary">
              차단한 사용자입니다
            </p>
            <p className="text-sm text-muted mt-1">
              이 사용자의 실시간 방송과 다시보기를 시청할 수 없습니다.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Live Section */}
          <LiveNowHero
            stream={liveStream}
            role={role}
            onFollow={focusFollowButton}
          />

          {/* VOD Section */}
          <RecordingGrid
            ownerId={userInfo.id}
            viewerId={viewerId ?? null}
            recordings={recordingsMemo}
            initialNextCursor={recordingsNextCursor}
            role={role}
            isFollowing={isFollowing}
            onFollow={focusFollowButton}
          />
        </div>
      )}
    </div>
  );
}
