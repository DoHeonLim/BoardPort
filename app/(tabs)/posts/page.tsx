/**
 * File Name : app/(tabs)/posts/page.tsx
 * Description : 항해일지 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.14  임도헌   Created
 * 2024.10.14  임도헌   Modified  동네생활 페이지 추가
 * 2024.11.23  임도헌   Modified  게시글을 최신 게시글순으로 출력되게 수정
 * 2024.11.23  임도헌   Modified  게시글 생성 링크 추가
 * 2024.12.12  임도헌   Modified  게시글 좋아요 명 변경
 * 2024.12.12  임도헌   Modified  게시글 생성 시간 표시 변경
 * 2024.12.18  임도헌   Modified  항해일지 페이지로 변경(동네생활 -> 항해일지)
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
 */

import { Metadata } from "next";
import { redirect } from "next/navigation";
import getSession from "@/lib/session";
import NotificationBell from "@/components/global/NotificationBell";
import PostList from "@/features/post/components/PostList";
import PostEmptyState from "@/features/post/components/PostEmptyState";
import AddPostButton from "@/features/post/components/AddPostButton";
import PostSearchBarWrapper from "@/features/post/components/PostSearchBarWrapper";
import PostCategoryTabs from "@/features/search/components/PostCategoryTabs";
import RegionFilterToggle from "@/features/search/components/RegionFilterToggle";
import MyLocationButton from "@/features/user/components/profile/MyLocationButton";
import { getUserLocation } from "@/features/user/service/profile";
import { getCachedInitialPosts } from "@/features/post/service/post";
import { getUnreadNotificationCount } from "@/features/notification/actions/count";
import type { PostSearchParams } from "@/features/post/types";
import type { RegionRange } from "@/generated/prisma/enums";

interface PostsPageProps {
  searchParams: {
    keyword?: string;
    category?: string;
  };
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
 * 1. 카테고리 탭(`PostCategoryTabs`)과 검색바(`PostSearchBarWrapper`)를 제공
 * 2. `getCachedInitialPosts` Service를 호출하여 초기 게시글 목록을 로드
 * 3. 게시글이 있으면 `PostList`, 없으면 `PostEmptyState`를 렌더링
 * 4. 우측 하단에 글쓰기 버튼(`AddPostButton`)을 표시
 *
 * @param {PostsPageProps} props - URL 쿼리 파라미터 (keyword, category)
 */
export default async function PostsPage({ searchParams }: PostsPageProps) {
  // Service 직접 호출 (캐싱된 초기 데이터)
  const session = await getSession();
  const userId = session.id;

  if (!userId) {
    redirect("/login?callbackUrl=/posts");
  }

  const params: PostSearchParams = {
    keyword: searchParams.keyword,
    category: searchParams.category,
  };

  const [initialData, unreadCount, userLocation] = await Promise.all([
    getCachedInitialPosts(params, userId),
    getUnreadNotificationCount(),
    getUserLocation(userId),
  ]);

  const userRegion1 = userLocation?.region1;
  const userRegion2 = userLocation?.region2;
  const userRegion3 = userLocation?.region3;
  const currentRange = (userLocation?.regionRange as RegionRange) ?? "GU";

  const fullLocation = userLocation
    ? [userLocation.region1, userLocation.region2, userLocation.region3]
        .filter(Boolean)
        .join(" ")
    : null;

  return (
    <div className="flex flex-col min-h-screen bg-background transition-colors pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border shadow-sm transition-colors">
        {/* Top Row: Region & Noti */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 h-[50px]">
          {userRegion2 ? (
            <RegionFilterToggle
              userRegion1={userRegion1}
              userRegion2={userRegion2}
              userRegion3={userRegion3}
              currentRange={currentRange}
            />
          ) : (
            <MyLocationButton variant="header" fullLocation={fullLocation} />
          )}
          <div className="shrink-0">
            <NotificationBell userId={userId} initialCount={unreadCount} />
          </div>
        </div>

        {/* Bottom Row: Search & Tabs */}
        <div className="flex flex-col gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <PostSearchBarWrapper />
          </div>
          {/* 게시글 카테고리 탭 */}
          <PostCategoryTabs currentCategory={searchParams.category} />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-page-x py-6">
        {initialData.posts.length === 0 ? (
          <PostEmptyState
            keyword={searchParams.keyword}
            category={searchParams.category}
          />
        ) : (
          <PostList
            // 검색 조건 변경 시 스크롤/상태 초기화를 위해 key 부여
            key={`${JSON.stringify(searchParams)}-${currentRange}`}
            initialPosts={initialData.posts}
            nextCursor={initialData.nextCursor}
            searchParams={params}
          />
        )}
      </div>

      {/* Add Button */}
      <AddPostButton />
    </div>
  );
}
