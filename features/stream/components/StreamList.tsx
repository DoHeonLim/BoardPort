/**
 * File Name : features/stream/components/StreamList.tsx
 * Description : 스트리밍 카드 리스트 + 자체 무한스크롤 상태 (URL 탭 구조 호환)
 * Author : 임도헌
 *
 * History
 * 2025.08.25  임도헌   Created   StreamCard 호환 + 내부 페이지네이션 내장
 * 2025.08.26  임도헌   Modified  usePageVisibility + 새 useInfiniteScroll 옵션 추가
 * 2025.09.10  임도헌   Modified  append 중복 방지(Map), 에러 메시지/aria 보강, 사소한 정리
 * 2025.09.17  임도헌   Modified  StreamCardItem 필드(startedAt/isLive) 정합화, append 병합 정리
 * 2025.09.17  임도헌   Modified  BroadcastSummary로 변경
 * 2026.01.03  임도헌   Modified  병합 로직 O(n²) 제거(Map 기반 O(n+m)으로 최적화)
 * 2026.01.04  임도헌   Modified  팔로우 즉시 반영: followDelta 구독으로 FOLLOWERS 잠금 카드 즉시 갱신
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 및 레이아웃 개선
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.01  임도헌   Modified  useStreamPagination 도입을 통해 내부 상태 및 팔로우 동기화 로직 제거
 * 2026.03.03  임도헌   Modified  명령형 로딩(isLoading) 상태 제거 및 선언적 렌더링 적용
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.06  임도헌   Modified  모바일 카드 간격과 데스크톱 간격을 분리해 리스트 밀도를 정리
 * 2026.03.06  임도헌   Modified  하단 무한스크롤 로딩 배지를 공통 유틸 클래스로 통일
 * 2026.03.25  임도헌   Modified  스트림 카드 간격을 뷰포트별로 재조정해 목록 리듬 완화
 * 2026.04.17  임도헌   Modified  스트림 목록의 검색 정규화/가시 탭 로딩/팔로우 요청 위임 책임 설명 보강
 */

"use client";

import { useRef } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import StreamCard from "@/features/stream/components/StreamCard";
import { useStreamPagination } from "@/features/stream/hooks/useStreamPagination";

type Scope = "all" | "following";

interface StreamListProps {
  scope: Scope;
  searchParams: { category?: string; keyword?: string };
  onRequestFollow?: (streamer: { id: number; username: string }) => void;
  viewerId?: number | null;
}

/**
 * 스트리밍 목록 렌더링 컴포넌트
 *
 * [기능]
 * - `scope`와 검색 파라미터를 정규화한 뒤 `useStreamPagination`에 전달해 목록/다음 페이지 상태를 조회
 * - 현재 보이는 탭에서만 `useInfiniteScroll`을 활성화해 숨겨진 탭의 추가 요청을 막음
 * - 카드 렌더링은 `StreamCard`에 위임하고, 팔로우가 필요한 경우 `onRequestFollow`만 상위에서 주입
 * - 하단 로딩 배지는 `isFetchingNextPage`로만 분리해 목록 본문과 무한 스크롤 상태를 단순하게 유지
 */
export default function StreamList({
  scope,
  searchParams,
  onRequestFollow,
  viewerId = null,
}: StreamListProps) {
  const isVisible = usePageVisibility();
  const triggerRef = useRef<HTMLDivElement>(null);

  // 검색 파라미터 정규화 (빈 문자열 제거)
  const category = (searchParams.category || "").trim();
  const keyword = (searchParams.keyword || "").trim();

  // 목록/다음 페이지 상태의 공용 Suspense pagination 훅 위임
  const { streams, isFetchingNextPage, hasMore, loadMore } =
    useStreamPagination({
      scope,
      searchParams: { category, keyword },
      viewerId,
    });

  // IntersectionObserver를 이용한 무한 스크롤 트리거 연결
  useInfiniteScroll({
    triggerRef,
    hasMore,
    // 데이터 중복 로딩을 방지하기 위해 다음 페이지 패칭 상태(isFetchingNextPage)를 로딩 플래그로 전달함
    isLoading: isFetchingNextPage,
    onLoadMore: loadMore,
    enabled: isVisible,
    rootMargin: "1200px 0px 0px 0px", // 사용자 경험 향상을 위한 조기 프리패치 여유 공간
    threshold: 0.01,
  });

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6">
        {streams.map((s) => {
          const tags = s.tags ?? [];
          return (
            <StreamCard
              key={s.id}
              id={s.id}
              title={s.title}
              thumbnail={s.thumbnail ?? null}
              isLive={s.status === "CONNECTED"}
              streamer={{
                username: s.user.username,
                avatar: s.user.avatar ?? null,
              }}
              startedAt={s.started_at}
              category={s.category}
              tags={tags}
              requiresPassword={s.requiresPassword}
              isFollowersOnly={s.visibility === "FOLLOWERS"}
              followersOnlyLocked={s.followersOnlyLocked}
              onRequestFollow={
                onRequestFollow
                  ? () =>
                      onRequestFollow({
                        id: s.user.id,
                        username: s.user.username,
                      })
                  : undefined
              }
              layout="grid"
            />
          );
        })}
      </div>

      {/* Loading */}
      <div className="py-8 min-h-[40px]">
        {hasMore && (
          <div ref={triggerRef} className="h-1 w-full" aria-hidden="true" />
        )}
        {isFetchingNextPage && (
          <div className="list-loading-pill">
            <span className="size-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            <span className="whitespace-nowrap">더 불러오는 중...</span>
          </div>
        )}
      </div>
    </>
  );
}
