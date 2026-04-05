/**
 * File Name : features/post/components/PostDesktopHeader.tsx
 * Description : 게시글 탭 데스크톱 전용 2단 헤더
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   데스크톱 게시글 헤더를 지역/검색/알림 + 카테고리 2단 구조 컴포넌트로 분리
 */
"use client";

import NotificationBell from "@/components/global/NotificationBell";
import PostSearchBarWrapper from "@/features/post/components/PostSearchBarWrapper";
import PostCategoryTabs from "@/features/search/components/PostCategoryTabs";
import RegionFilterToggle from "@/features/search/components/RegionFilterToggle";
import MyLocationButton from "@/features/user/components/profile/MyLocationButton";
import type { RegionRange } from "@/generated/prisma/enums";

interface PostDesktopHeaderProps {
  userId: number;
  unreadCount: number;
  currentCategory?: string;
  userRegion1?: string | null;
  userRegion2?: string | null;
  userRegion3?: string | null;
  currentRange: RegionRange | "ALL";
  fullLocation: string | null;
}

/**
 * 게시글 탭 데스크톱 헤더
 *
 * [기능]
 * - 지역, 검색, 알림을 1행에서 제공
 * - 카테고리 탭을 2행에서 제공
 * - 모바일 헤더와 동일한 정보 구조를 데스크톱 레이아웃으로 분리
 */
export default function PostDesktopHeader({
  userId,
  unreadCount,
  currentCategory,
  userRegion1,
  userRegion2,
  userRegion3,
  currentRange,
  fullLocation,
}: PostDesktopHeaderProps) {
  return (
    <header className="sticky top-0 z-30 hidden border-b border-border-subtle bg-background shadow-sm transition-colors md:block">
      <div className="mx-auto max-w-5xl px-3 py-2 md:px-5 md:py-3 lg:px-6">
        <div className="flex items-center gap-2 md:gap-3">
          {userRegion1 ? (
            <RegionFilterToggle
              userRegion1={userRegion1}
              userRegion2={userRegion2}
              userRegion3={userRegion3}
              currentRange={currentRange}
              tone="neutral"
            />
          ) : (
            <MyLocationButton variant="header" fullLocation={fullLocation} />
          )}
          <PostSearchBarWrapper
            className="flex-1"
            compact
            placeholder="게시글 검색"
          />
          <div className="shrink-0">
            <NotificationBell userId={userId} initialCount={unreadCount} />
          </div>
        </div>
        <div className="mt-2 rounded-xl border border-border-subtle bg-background">
          <PostCategoryTabs
            currentCategory={currentCategory}
            compact
            tone="neutral"
          />
        </div>
      </div>
    </header>
  );
}
