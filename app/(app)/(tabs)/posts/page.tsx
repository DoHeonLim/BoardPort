/**
 * File Name : app/(app)/(tabs)/posts/page.tsx
 * Description : 항해일지 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.14  임도헌   Created
 * 2024.10.14  임도헌   Modified  게시글 페이지 추가
 * 2024.11.23  임도헌   Modified  게시글을 최신 게시글순으로 출력되게 수정
 * 2024.11.23  임도헌   Modified  게시글 생성 링크 추가
 * 2024.12.12  임도헌   Modified  게시글 좋아요 명 변경
 * 2024.12.12  임도헌   Modified  게시글 생성 시간 표시 변경
 * 2024.12.18  임도헌   Modified  항해일지 페이지로 명칭 변경
 * 2024.12.23  임도헌   Modified  게시글 페이지 다크모드 추가
 * 2025.05.06  임도헌   Modified  그리드/리스트 뷰 모드 추가
 * 2025.05.06  임도헌   Modified  게시글 페이지 컴포넌트 수정
 * 2025.06.26  임도헌   Modified  PostList, PostCard 분리 및 검색 구조 개선
 * 2025.11.20  임도헌   Modified  게시글 페이지 동적으로 변경
 * 2026.01.03  임도헌   Modified  force-dynamic 제거(명시적 강제 제거), 캐시(nextCache + POST_LIST 태그)로 전환
 * 2026.01.13  임도헌   Modified  [UI] Sticky Header 디자인 통일 및 시맨틱 토큰 적용
 * 2026.01.22  임도헌   Modified  Service 직접 호출로 최적화 (Action 의존 제거)
 * 2026.01.27  임도헌   Modified  주석 보강
 * 2026.02.04  임도헌   Modified  차단 관계 확인 로직 추가
 * 2026.02.08  임도헌   Modified  헤더 우측에 알림 벨(NotificationBell) 추가, 검색창과 카테고리 탭 위치 변경
 * 2026.02.13  임도헌   Modified  generateMetadata 추가
 * 2026.02.15  임도헌   Modified  헤더에 RegionFilterToggle 및 MyLocationButton 적용
 * 2026.02.21  임도헌   Modified  searchParams.region 레거시 제거 및 DB 기반 currentRange 연동
 * 2026.03.03  임도헌   Modified  서버 컴포넌트 하이드레이션(HydrationBoundary) 적용
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.06  임도헌   Modified  상단 검색/카테고리 영역을 제품 탭과 유사한 행 분리 구조로 정리해 헤더 밀도를 통일
 * 2026.03.06  임도헌   Modified  Suspense fallback을 실제 게시글 카드 스켈레톤 구조로 통일
 * 2026.03.09  임도헌   Modified  모바일 상단 검색/카테고리 영역 높이를 압축해 리스트 가시 영역 확보
 * 2026.03.11  임도헌   Modified  모바일 게시글 헤더를 제품 탭과 동일한 2단 구조 및 스크롤 숨김 동작으로 통일
 * 2026.03.11  임도헌   Modified  지역 범위(currentRange)를 게시글 목록 쿼리 키에 포함해 범위 전환 시 캐시 stale 문제 방지
 * 2026.03.12  임도헌   Modified  모바일/데스크톱 헤더 분기와 알림/지역 정보 preload 흐름 추가
 * 2026.03.14  임도헌   Modified  총 게시글 수 고정 표시를 위한 totalCount 연결 및 EmptyState에 currentRange 힌트 전달
 * 2026.03.14  임도헌   Modified  데스크톱 헤더를 전용 컴포넌트로 분리하고 지역 중심 카테고리 범위 안내 힌트를 추가
 * 2026.03.16  임도헌   Modified  모바일 목록 영역 pull-to-refresh 지원 추가
 * 2026.03.18  임도헌   Modified  detail-edit 삭제 후 back 복귀와 로그인 가드 안정성을 함께 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/posts/page.tsx 에서 app/(app)/(tabs)/posts/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.20  임도헌   Modified  앱 셸(sm) 기준과 헤더 분기 기준을 일치시켜 640~767px 구간 헤더 레이아웃 mismatch 정리
 * 2026.05.17  임도헌   Modified  prefetch 데이터 타입을 InfiniteData로 명시
 * 2026.06.18  임도헌   Modified  정규화된 지역 표시 포맷을 사용해 중복 지역명 노출 방지
 * 2026.06.18  임도헌   Modified  게시글 목록 쿼리 키에 실제 지역값을 포함해 동네 변경 캐시 충돌 방지
 * 2026.08.13  임도헌   Modified  게시글 목록 prefetch와 클라이언트 캐시를 조회자별로 분리
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 */

import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  dehydrate,
  HydrationBoundary,
  type InfiniteData,
} from "@tanstack/react-query";
import PullToRefresh from "@/components/global/PullToRefresh";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import getSession from "@/lib/session";
import PostList from "@/features/post/components/PostList";
import PostMobileHeader from "@/features/post/components/PostMobileHeader";
import PostDesktopHeader from "@/features/post/components/PostDesktopHeader";
import PostEmptyState from "@/features/post/components/PostEmptyState";
import PostLocalRangeHint from "@/features/post/components/PostLocalRangeHint";
import AddPostButton from "@/features/post/components/AddPostButton";
import PostListSkeleton from "@/features/post/components/PostListSkeleton";
import PostListRefreshRelay from "@/features/post/components/PostListRefreshRelay";
import { getUserLocation } from "@/features/user/service/profile";
import { getPostsListAction } from "@/features/post/actions/list";
import { getUnreadNotificationCount } from "@/features/notification/actions/count";
import { formatNormalizedRegion } from "@/features/map/utils/normalizeRegion";
import type {
  PostSearchParams,
  PostsPage as PostsListPage,
} from "@/features/post/types";
import type { RegionRange } from "@/generated/prisma/enums";

interface PostsPageProps {
  searchParams: Promise<{
    keyword?: string;
    category?: string;
  }>;
}

export const metadata: Metadata = {
  title: "항해일지 (커뮤니티)",
  description: "보드게이머들의 이야기와 정보를 공유하는 공간입니다.",
  openGraph: {
    title: "보드포트 항해일지",
    description: "보드게임 공략, 후기, 잡담을 나누는 커뮤니티입니다.",
  },
};

/**
 * 게시글 목록 페이지
 *
 * [기능]
 * - 로그인 세션 검증 및 비인가 사용자 리다이렉트 처리
 * - 알림 개수와 사용자 지역 정보를 선조회하여 헤더 초기 상태 구성
 * - 모바일/데스크톱 헤더를 분리 렌더링하여 같은 검색 UX를 기기별 레이아웃에 맞게 제공
 * - URL 검색 조건을 기반으로 `getPostsListAction`을 호출하여 초기 게시글 목록 서버 프리패치(Prefetch)
 * - `currentRange`를 게시글 목록 쿼리 키에 포함하여 지역 범위 전환 시 캐시 stale 방지
 * - TanStack Query HydrationBoundary 적용으로 클라이언트 사이드 워터폴 현상 방지
 * - 게시글 데이터 유무에 따른 `PostList` 또는 `PostEmptyState` 조건부 렌더링
 *
 * @param {PostsPageProps} props - URL 쿼리 파라미터 (keyword, category)
 */
export default async function PostsPage(props: PostsPageProps) {
  const searchParams = await props.searchParams;
  const session = await getSession();
  if (!session?.id) {
    redirect("/login?callbackUrl=/posts");
  }
  const userId = session.id;

  const queryClient = getQueryClient();
  const params: PostSearchParams = {
    keyword: searchParams.keyword,
    category: searchParams.category,
  };

  const [unreadCount, userLocation] = await Promise.all([
    getUnreadNotificationCount(),
    getUserLocation(userId),
  ]);

  const userRegion1 = userLocation?.region1;
  const userRegion2 = userLocation?.region2;
  const userRegion3 = userLocation?.region3;
  const currentRange = (userLocation?.regionRange as RegionRange) ?? "GU";
  const postListScope = {
    range: currentRange,
    region1: userRegion1 ?? "",
    region2: userRegion2 ?? "",
    region3: userRegion3 ?? "",
  };
  const postListQueryKey = {
    ...params,
    __scope: postListScope,
  };

  const fullLocation = userLocation
    ? formatNormalizedRegion(userLocation)
    : null;

  await queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.posts.list(postListQueryKey, userId),
    queryFn: () => getPostsListAction(null, params),
    initialPageParam: null as number | null,
  });

  // 데이터 여부 확인
  const prefetchData = queryClient.getQueryData<InfiniteData<PostsListPage>>(
    queryKeys.posts.list(postListQueryKey, userId)
  );
  const isDataEmpty = prefetchData?.pages[0]?.posts.length === 0;

  return (
    <div className="flex flex-col min-h-screen bg-background transition-colors pb-24">
      <PostListRefreshRelay />
      <div className="sm:hidden">
        <PostMobileHeader
          userId={userId}
          unreadCount={unreadCount}
          currentCategory={searchParams.category}
          userRegion1={userRegion1}
          userRegion2={userRegion2}
          userRegion3={userRegion3}
          currentRange={currentRange}
          fullLocation={fullLocation}
        />
      </div>

      <PostDesktopHeader
        userId={userId}
        unreadCount={unreadCount}
        currentCategory={searchParams.category}
        userRegion1={userRegion1}
        userRegion2={userRegion2}
        userRegion3={userRegion3}
        currentRange={currentRange}
        fullLocation={fullLocation}
      />

      {/* Content */}
      <PullToRefresh className="flex-1">
        <div className="flex-1 px-page-x py-4 sm:py-6">
          <PostLocalRangeHint
            currentCategory={searchParams.category}
            currentRange={currentRange}
          />
          {isDataEmpty ? (
            <PostEmptyState
              keyword={searchParams.keyword}
              category={searchParams.category}
              currentRange={currentRange}
            />
          ) : (
            <HydrationBoundary state={dehydrate(queryClient)}>
              <Suspense fallback={<PostListSkeleton viewMode="list" />}>
                <PostList
                  key={`${JSON.stringify(searchParams)}-${JSON.stringify(postListScope)}`}
                  searchParams={params}
                  queryKeyExtra={postListScope}
                  viewerId={userId}
                />
              </Suspense>
            </HydrationBoundary>
          )}
        </div>
      </PullToRefresh>
      {/* 게시글 추가 플로팅 버튼 (FAB) */}
      <AddPostButton />
    </div>
  );
}
