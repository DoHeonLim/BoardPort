/**
 * File Name : features/stream/components/RecordingList.tsx
 * Description : 메인 다시보기 카드 리스트 + 무한 스크롤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.28  임도헌   Created   스트림 메인 탭용 다시보기 그리드 리스트 추가
 * 2026.04.16  임도헌   Modified  첫 다시보기 카드 썸네일을 우선 로드해 LCP 후보를 더 빠르게 노출
 * 2026.04.17  임도헌   Modified  다시보기 무한 스크롤과 첫 카드 우선 로드 책임이 주석에서 바로 드러나도록 설명 보강
 * 2026.05.03  임도헌   Modified  다시보기 카드에 연결 보드게임 요약 배지 표시
 */
"use client";

import { useRef } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import StreamCard from "@/features/stream/components/StreamCard";
import { useRecordingPagination } from "@/features/stream/hooks/useRecordingPagination";

interface RecordingListProps {
  sort: "latest" | "popular";
  followingOnly?: boolean;
  searchParams: {
    category?: string;
    keyword?: string;
    sort?: string;
    scope?: string;
  };
  onRequestFollow?: (streamer: { id: number; username: string }) => void;
  viewerId?: number | null;
}

/**
 * 스트림 메인 탭용 다시보기 리스트
 *
 * - `useRecordingPagination`으로 정렬/팔로잉/검색 조건에 맞는 VOD 목록을 가져온다
 * - `useInfiniteScroll`과 `usePageVisibility`를 결합해 보이는 탭에서만 다음 페이지를 불러온다
 * - 첫 카드만 `thumbnailPriority`를 주어 다시보기 목록의 대표 LCP 후보를 먼저 노출
 */
export default function RecordingList({
  sort,
  followingOnly = false,
  searchParams,
  onRequestFollow,
  viewerId = null,
}: RecordingListProps) {
  const isVisible = usePageVisibility();
  const triggerRef = useRef<HTMLDivElement>(null);

  const category = (searchParams.category || "").trim();
  const keyword = (searchParams.keyword || "").trim();

  const { recordings, isFetchingNextPage, hasMore, loadMore } =
    useRecordingPagination({
      sort,
      followingOnly,
      searchParams: {
        category,
        keyword,
        sort,
        scope: followingOnly ? "following" : "",
      },
      viewerId,
    });

  useInfiniteScroll({
    triggerRef,
    hasMore,
    isLoading: isFetchingNextPage,
    onLoadMore: loadMore,
    enabled: isVisible,
    rootMargin: "1200px 0px 0px 0px",
    threshold: 0.01,
  });

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6">
        {recordings.map((rec) => (
          <StreamCard
            key={`vod-${rec.vodId}`}
            id={rec.broadcastId}
            vodIdForRecording={rec.vodId}
            title={rec.title}
            thumbnail={rec.thumbnail}
            thumbnailAnimated={rec.thumbnailAnimated}
            isLive={false}
            showReplayBadge
            streamer={{
              username: rec.user.username,
              avatar: rec.user.avatar ?? null,
            }}
            startedAt={rec.readyAt}
            category={rec.category}
            tags={rec.tags}
            boardGames={rec.board_games}
            duration={rec.duration}
            viewCount={rec.viewCount}
            href={rec.href}
            requiresPassword={rec.requiresPassword}
            isFollowersOnly={rec.visibility === "FOLLOWERS"}
            followersOnlyLocked={rec.followersOnlyLocked}
            onRequestFollow={
              onRequestFollow
                ? () =>
                    onRequestFollow({
                      id: rec.user.id,
                      username: rec.user.username,
                    })
                : undefined
            }
            isPrivateType={rec.visibility === "PRIVATE"}
            layout="grid"
            thumbnailPriority={rec.vodId === recordings[0]?.vodId}
          />
        ))}
      </div>

      <div className="min-h-[40px] py-8">
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
    </>
  );
}
