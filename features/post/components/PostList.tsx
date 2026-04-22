/**
 * File Name : features/post/components/PostList.tsx
 * Description : 게시글 목록 렌더링
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   게시글 목록 렌더링 컴포넌트 구현
 * 2025.07.04  임도헌   Modified  검색 조건 변경 시 상태 초기화
 * 2025.08.26  임도헌   Modified  usePageVisibility + 새 useInfiniteScroll 옵션 추가
 * 2025.08.26  임도헌   Modified  UI 충돌 수정(grid + flex 동시 적용 가능성)
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 뷰 모드 토글 스타일 통일
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.27  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.01  임도헌   Modified  isFetchingNextPage 분리 및 하단 스피너 UI 통일 (Product 도메인과 정합성 확보)
 * 2026.03.03  임도헌   Modified  명령형 로딩(isLoading) 분기 제거, 선언적 렌더링 적용
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.06  임도헌   Modified  뷰 토글 active 상태 및 다크모드 대비 보강
 * 2026.03.06  임도헌   Modified  모바일 그리드 카드 간격을 조정해 게시글 카드 밀도를 더 촘촘하게 정리
 * 2026.03.06  임도헌   Modified  하단 무한스크롤 로딩 배지를 공통 유틸 클래스로 통일
 * 2026.03.11  임도헌   Modified  currentRange를 queryKeyExtra로 전달해 지역 범위 전환 시 캐시 stale 방지
 * 2026.03.12  임도헌   Modified  게시글 뷰 토글 외곽선을 border-border-subtle 톤으로 통일
 * 2026.03.14  임도헌   Modified  첫 페이지 totalCount를 활용해 총 게시글 수와 뷰 토글을 같은 헤더 row로 정리
 * 2026.03.26  임도헌   Modified  리스트 뷰 본문 폭과 헤더 간격을 조정해 게시글 카드 리듬을 정리
 * 2026.04.14  임도헌   Modified  현재 목록 경로(returnTo) 계산을 상위 리스트로 승격해 카드별 훅 비용을 줄임
 * 2026.04.14  임도헌   Modified  상단 3개 게시글 카드까지 우선 로드해 실제 LCP 후보를 lazy 대상에서 제외
 * 2026.04.14  임도헌   Modified  LCP 우선 로드 카드 수 상수를 모듈 상단으로 분리하고 파생값 구간을 역할별로 정리
 */

"use client";

import { useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { usePostPagination } from "@/features/post/hooks/usePostPagination";
import PostCard from "@/features/post/components/postCard";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { ListBulletIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { PostSearchParams } from "@/features/post/types";
import { cn } from "@/lib/utils";

interface PostListProps {
  searchParams: PostSearchParams;
  queryKeyExtra?: unknown;
}

const LCP_PRIORITY_CARD_COUNT = 3;

/**
 * 게시글 목록 렌더링 컴포넌트
 *
 * [상태 주입 및 페이징 로직]
 * - `usePostPagination` 훅을 통한 캐시 데이터 추출 및 무한 스크롤 상태 전역 관리
 * - queryKeyExtra(currentRange) 기준 캐시 분리
 * - 사용자 가시성(`usePageVisibility`) 기반의 `useInfiniteScroll` 스크롤 감지 및 페이징 요청 제어
 * - 뷰 모드(List/Grid) 전환 로컬 상태 관리 및 적용
 * - 첫 페이지 `totalCount`를 활용한 총 게시글 수 문구 고정 표시
 * - 데이터 페칭 상태(`isFetchingNextPage`)에 따른 하단 스피너 조건부 렌더링 적용
 */
export default function PostList({
  searchParams,
  queryKeyExtra,
}: PostListProps) {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const isVisible = usePageVisibility();
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();

  // Suspense에 의해 data 보장
  const { posts, totalCount, isFetchingNextPage, hasMore, loadMore } =
    usePostPagination({
      searchParams,
      queryKeyExtra,
    });

  // 렌더링용 파생값의 훅 호출 아래 1회 계산
  const displayCount = totalCount ?? posts.length;
  const returnTo = useMemo(() => {
    const next = currentSearchParams.toString();
    return sanitizeCallbackUrl(pathname + (next ? `?${next}` : ""));
  }, [pathname, currentSearchParams]);

  useInfiniteScroll({
    triggerRef,
    hasMore,
    // 스크롤 호출 중복 방지는 다음 페이지를 불러오는 중인지(isFetchingNextPage)를 기준으로 함
    isLoading: isFetchingNextPage,
    onLoadMore: loadMore,
    enabled: isVisible, // 탭이 백그라운드면 로딩 중단
    rootMargin: "1000px 0px 0px 0px", // 조기 프리패치 여유
    threshold: 0.01,
  });

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3 px-1 sm:mb-6">
        <span className="shrink-0 text-sm font-medium text-muted">
          총 <span className="font-bold text-primary">{displayCount}</span>개의
          게시글
        </span>

        {/* 뷰 모드 전환 버튼 영역 */}
        <div className="flex rounded-xl border border-border-subtle bg-surface-dim/80 p-1 shadow-sm">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-[background-color,color,border-color,box-shadow]",
              viewMode === "list"
                ? "bg-background text-brand dark:text-brand-light shadow-sm ring-1 ring-border/70"
                : "text-muted hover:bg-background/70 hover:text-primary"
            )}
            aria-label="리스트 뷰"
          >
            <ListBulletIcon className="size-5" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-[background-color,color,border-color,box-shadow]",
              viewMode === "grid"
                ? "bg-background text-brand dark:text-brand-light shadow-sm ring-1 ring-border/70"
                : "text-muted hover:bg-background/70 hover:text-primary"
            )}
            aria-label="그리드 뷰"
          >
            <Squares2X2Icon className="size-5" />
          </button>
        </div>
      </div>

      {/* 제품 카드 */}
      <div
        className={cn(
          viewMode === "grid"
            ? "grid grid-cols-2 gap-3 sm:gap-4"
            : "mx-auto grid max-w-4xl grid-cols-1 gap-3 sm:gap-4"
        )}
      >
        {posts.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            viewMode={viewMode}
            isPriority={index < LCP_PRIORITY_CARD_COUNT}
            returnTo={returnTo}
          />
        ))}
      </div>

      <div className="py-8 min-h-[40px]">
        {hasMore && (
          <div
            ref={triggerRef}
            className="h-1 w-full"
            aria-hidden="true"
            tabIndex={-1}
          />
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
