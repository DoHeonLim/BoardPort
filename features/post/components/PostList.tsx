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
 * 2026.05.30  임도헌   Modified  게시글 뷰 토글을 제품 목록 토글 톤과 통일
 * 2026.08.13  임도헌   Modified  게시글 목록 query에 현재 조회자 ID 전달
 * 2026.09.08  임도헌   Modified  메인 게시글 목록 도구 행에 정렬 선택 추가
 * 2026.09.11  임도헌   Modified  실제 대표 이미지가 있는 첫 게시글을 LCP 우선 대상으로 지정
 * 2026.09.11  임도헌   Modified  첫 화면 실제 대표 이미지 2장을 LCP 우선 대상으로 지정
 * 2026.09.12  임도헌   Modified  목록 보기 방식을 URL에 보존하고 토글 선택 상태 접근성 보강
 * 2026.09.13  임도헌   Modified  리스트·그리드 전환 UI를 공통 컴포넌트로 통일
 * 2026.09.14  임도헌   Modified  중간 너비 목록 도구 영역을 두 행 구조로 고정
 */

"use client";

import { useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { usePostPagination } from "@/features/post/hooks/usePostPagination";
import PostCard from "@/features/post/components/postCard";
import { getPostCardThumbnail } from "@/features/post/components/postCard/PostCardThumbnail";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { PostSearchParams } from "@/features/post/types";
import PostSortSelect from "@/features/post/components/PostSortSelect";
import { cn } from "@/lib/utils";
import ViewModeToggle from "@/components/ui/ViewModeToggle";

interface PostListProps {
  searchParams: PostSearchParams;
  queryKeyExtra?: unknown;
  viewerId: number;
}

const LCP_EAGER_IMAGE_COUNT = 2;

/**
 * 게시글 목록 렌더링 컴포넌트
 *
 * [상태 주입 및 페이징 로직]
 * - `usePostPagination` 훅을 통한 캐시 데이터 추출 및 무한 스크롤 상태 전역 관리
 * - queryKeyExtra(currentRange) 기준 캐시 분리
 * - 사용자 가시성(`usePageVisibility`) 기반의 `useInfiniteScroll` 스크롤 감지 및 페이징 요청 제어
 * - 뷰 모드(List/Grid) 전환 로컬 상태 관리 및 적용
 * - 첫 페이지 `totalCount`를 활용한 총 게시글 수 문구 고정 표시
 * - 메인 게시글 목록에서는 URL과 연결된 현재 정렬 선택 표시
 * - 데이터 페칭 상태(`isFetchingNextPage`)에 따른 하단 스피너 조건부 렌더링 적용
 */
export default function PostList({
  searchParams,
  queryKeyExtra,
  viewerId,
}: PostListProps) {
  const isVisible = usePageVisibility();
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  const viewMode = currentSearchParams.get("view") === "grid" ? "grid" : "list";

  // 목록 보기 방식 URL 반영
  // 기본 리스트 파라미터는 생략하고 그리드 선택만 남겨 상세 복귀와 새로고침 문맥 보존
  const handleViewModeChange = (nextView: "list" | "grid") => {
    const params = new URLSearchParams(currentSearchParams.toString());
    if (nextView === "grid") {
      params.set("view", "grid");
    } else {
      params.delete("view");
    }
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${pathname}?${query}` : pathname
    );
  };

  // Suspense에 의해 data 보장
  const { posts, totalCount, isFetchingNextPage, hasMore, loadMore } =
    usePostPagination({
      searchParams,
      queryKeyExtra,
      viewerId,
    });

  // 렌더링용 파생값의 훅 호출 아래 1회 계산
  const displayCount = totalCount ?? posts.length;
  const priorityPostIds = new Set(
    posts
      .filter((post) => Boolean(getPostCardThumbnail(post.images, post.blocks)))
      .slice(0, LCP_EAGER_IMAGE_COUNT)
      .map((post) => post.id)
  );
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
    rootMargin: "0px 0px 1000px 0px", // 하단 조기 프리패치 여유
    threshold: 0.01,
  });

  return (
    <>
      <div className="mb-5 grid grid-cols-1 gap-3 px-1 min-[560px]:flex min-[560px]:flex-nowrap min-[560px]:items-center min-[560px]:justify-between sm:mb-6">
        <span className="shrink-0 text-sm font-medium text-muted">
          총 <span className="font-bold text-primary">{displayCount}</span>개의
          게시글
        </span>

        <div className="flex w-full shrink-0 items-center justify-between gap-2 min-[560px]:w-auto min-[560px]:justify-start">
          {searchParams.sort && <PostSortSelect value={searchParams.sort} />}

          <ViewModeToggle
            value={viewMode}
            onChange={handleViewModeChange}
            ariaLabel="게시글 목록 보기 방식"
          />
        </div>
      </div>

      {/* 게시글 카드 목록 */}
      <div
        className={cn(
          viewMode === "grid"
            ? "grid grid-cols-2 gap-3 sm:gap-4"
            : "mx-auto grid max-w-4xl grid-cols-1 gap-3 sm:gap-4"
        )}
      >
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            viewMode={viewMode}
            isPriority={priorityPostIds.has(post.id)}
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
