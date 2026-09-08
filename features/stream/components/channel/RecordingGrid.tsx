/**
 * File Name : features/stream/components/channel/RecordingGrid.tsx
 * Description : 녹화본 목록 그리드
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.09  임도헌   Created   다시보기 그리드 분리
 * 2025.08.14  임도헌   Modified  썸네일 URL 정규화 + StreamCard 재사용
 * 2025.08.26  임도헌   Modified  서버 계산 플래그 우선 적용
 * 2025.08.27  임도헌   Modified  unlock 타깃 streamId 우선 전달
 * 2025.09.05  임도헌   Modified  (보강) unlock 타깃 streamId 우선 전달 로직 명시 + 불리언 캐스팅
 * 2025.09.13  임도헌   Modified  ended_at 우선 노출, TimeAgo에 Date 직접 전달, 반응형 1/2열
 * 2025.09.21  임도헌   Modified  카드 key를 vodId 기반으로, href 전달로 vodId 경로 사용
 * 2025.09.22  임도헌   Modified  VodForGrid(readyAt/duration/viewCount) 기준으로 정리
 * 2025.11.23  임도헌   Modified  StreamCard layout(grid) 명시 및 카드 래퍼 정리,
 *                                다시보기 메타 영역(길이/조회수) 높이 일관화
 * 2025.12.20  임도헌   Modified  FOLLOWERS/PRIVATE 잠금 정책 주석 보강(팔로우 vs 언락 플로우 구분)
 * 2026.01.04  임도헌   Modified  팔로우 즉시 반영: FOLLOWERS 잠금은 role/isFollowing을 SSOT로 계산
 * 2026.01.14  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.25  임도헌   Modified  UI 깨짐 수정: StreamCard 내부 렌더링 위임 (duration, viewCount 전달)
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.12  임도헌   Modified  다시보기 카드에 thumbnailAnimated 메타를 전달해 GIF만 조건부 최적화 예외 처리
 * 2026.03.17  임도헌   Modified  다시보기 섹션 헤더와 그리드 래퍼를 패널형 구조로 정리해 채널 페이지 톤 일관성 보강
 * 2026.03.17  임도헌   Modified  다시보기 섹션 패널과 카드 외곽선을 border-border-subtle 톤으로 조정
 * 2026.03.19  임도헌   Modified  StreamCard 바깥의 이중 프레임 래퍼를 제거해 다시보기 카드 밀도와 톤을 가볍게 정리
 * 2026.03.21  임도헌   Modified  유저 채널 다시보기 카드에서는 소유자 정보가 자명하므로 StreamCard 스트리머 행 숨김
 * 2026.03.25  임도헌   Modified  다시보기 1개일 때 2열 그리드 공백이 과해 보이지 않도록 단일 카드 레이아웃을 보정
 * 2026.04.17  임도헌   Modified  Lighthouse 대응: 첫 다시보기 카드 썸네일만 우선 로드해 유저 채널 LCP 후보를 앞당김
 * 2026.05.03  임도헌   Modified  채널 다시보기 카드에 연결 보드게임 요약 배지 표시
 * 2026.05.15  임도헌   Modified  채널 다시보기에 커스텀 훅 기반 무한스크롤 적용
 * 2026.05.18  임도헌   Modified  채널 다시보기 카드에 좋아요/댓글 메타 전달
 * 2026.08.13  임도헌   Modified  채널 다시보기 query에 현재 조회자 ID 전달
 */

"use client";

import { useRef } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import StreamCard from "@/features/stream/components/StreamCard";
import RecordingEmptyState from "@/features/stream/components/channel/RecordingEmptyState";
import { useChannelRecordingsPagination } from "@/features/stream/hooks/useChannelRecordingsPagination";
import type { ViewerRole, VodForGrid } from "@/features/stream/types";

interface Props {
  ownerId: number;
  viewerId?: number | null;
  recordings: VodForGrid[]; // VOD 중심 (readyAt/duration/viewCount 포함)
  initialNextCursor?: number | null;
  role: ViewerRole;
  isFollowing: boolean;
  onFollow?: () => void;
}

/**
 * 지난 방송(녹화본) 목록을 반응형 그리드로 표시하는 컴포넌트
 *
 * [기능]
 * 1. SSR로 받은 첫 페이지를 커스텀 훅에 주입하고, 이후 페이지는 무한스크롤로 추가 로드
 * 2. 각 카드의 접근 권한(Private, Followers)을 뷰어 역할(Role)에 따라 계산하여 전달
 * 3. 목록이 비어있을 경우 `RecordingEmptyState`를 표시
 */
export default function RecordingGrid({
  ownerId,
  viewerId = null,
  recordings,
  initialNextCursor = null,
  role,
  isFollowing,
  onFollow,
}: Props) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const isVisible = usePageVisibility();
  const {
    recordings: pagedRecordings,
    isFetchingNextPage,
    hasMore,
    loadMore,
  } = useChannelRecordingsPagination({
    ownerId,
    viewerId,
    initialRecordings: recordings,
    initialNextCursor,
  });

  // 다른 피드형 목록과 동일한 화면 하단 감지 기반 다음 VOD 페이지 요청
  useInfiniteScroll({
    triggerRef,
    hasMore,
    isLoading: isFetchingNextPage,
    onLoadMore: loadMore,
    enabled: isVisible,
    rootMargin: "0px 0px 1000px 0px",
    threshold: 0.01,
  });

  // 상단에서 이미 빈 배열을 거르는 게 단순/안전
  if (!pagedRecordings.length)
    return (
      <RecordingEmptyState
        role={role}
        isFollowing={isFollowing}
        onFollow={onFollow}
      />
    );

  const isSingleRecording = pagedRecordings.length === 1;

  return (
    <div className="mx-auto max-w-3xl px-4 w-full">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-primary">다시보기</h2>
        <p className="mt-1 text-sm text-muted">
          지난 방송 기록을 다시 확인하고 공유할 수 있습니다.
        </p>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface p-3 shadow-sm sm:p-4">
        <div
          className={
            isSingleRecording
              ? "grid grid-cols-1 gap-4 sm:max-w-[420px]"
              : "grid grid-cols-1 gap-4 sm:grid-cols-2"
          }
        >
          {pagedRecordings.map((rec, index) => {
            // 표시 시간 = readyAt (없으면 생략)
            const when = rec.readyAt ?? null;

            // 길이
            const hasDuration =
              typeof rec.duration === "number" && rec.duration > 0;

            // 조회수
            const hasViews =
              typeof rec.viewCount === "number" && rec.viewCount >= 0;

            // 팔로워 방송인지
            const isFollowersOnly = rec.visibility === "FOLLOWERS";

            /**
             * FOLLOWERS 잠금의 "팔로우 직후 즉시 반영" 보장
             * - 서버 플래그(rec.followersOnlyLocked)는 초기 렌더 기본값으로만 사용
             * - 클라이언트 상태(role/isFollowing)를 SSOT로 한 번 더 적용해 잠금 여부 계산
             *
             * 규칙:
             * - OWNER는 항상 잠금 없음
             * - FOLLOWERS 타입이고 OWNER가 아니면: isFollowing이 false일 때만 잠금
             * - 그 외 타입은 서버 플래그 기준
             */
            const followersOnlyLocked = isFollowersOnly
              ? role !== "OWNER" && !isFollowing
              : !!rec.followersOnlyLocked;

            // PRIVATE는 팔로우로 풀리는 게 아니라 "언락 여부"라 서버 플래그 유지가 맞음
            const requiresPassword = !!rec.requiresPassword;

            // unlock 타깃 = 부모 Broadcast id
            const unlockTargetId = rec.broadcastId;

            // 상세 경로: 없으면 vodId로 폴백
            const href = rec.href ?? `/streams/${rec.vodId}/recording`;

            // key = vodId
            const key = `vod-${rec.vodId}`;

            return (
              <StreamCard
                key={key}
                id={unlockTargetId}
                title={rec.title}
                thumbnail={rec.thumbnail}
                thumbnailAnimated={rec.thumbnailAnimated}
                isLive={false}
                showReplayBadge
                streamer={{
                  username: rec.user.username,
                  avatar: rec.user.avatar ?? null,
                }}
                startedAt={when}
                category={rec.category}
                boardGames={rec.board_games}
                duration={hasDuration ? rec.duration : undefined}
                viewCount={hasViews ? rec.viewCount : undefined}
                likeCount={rec.likeCount}
                commentCount={rec.commentCount}
                isLiked={rec.isLiked}
                href={href}
                requiresPassword={requiresPassword}
                isFollowersOnly={isFollowersOnly}
                followersOnlyLocked={followersOnlyLocked}
                onRequestFollow={followersOnlyLocked ? onFollow : undefined}
                isPrivateType={rec.visibility === "PRIVATE"}
                layout="grid"
                showStreamer={false}
                thumbnailPriority={index === 0}
              />
            );
          })}
        </div>

        <div className="min-h-[40px] py-6">
          {hasMore && (
            <div ref={triggerRef} className="h-1 w-full" aria-hidden="true" />
          )}
          {isFetchingNextPage && (
            <div className="list-loading-pill">
              <span className="size-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
              <span className="whitespace-nowrap">더 불러오는 중...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
