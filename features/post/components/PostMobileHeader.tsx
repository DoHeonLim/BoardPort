/**
 * File Name : features/post/components/PostMobileHeader.tsx
 * Description : 게시글 탭 모바일 전용 헤더
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.11  임도헌   Created   게시글 탭 모바일 헤더를 지역/검색/알림 + 카테고리 2단 구조로 분리
 * 2026.03.11  임도헌   Modified  공용 useHideableHeader 훅을 적용해 스크롤 숨김/재노출 동작을 제품 탭과 통일
 * 2026.03.12  임도헌   Modified  지역/검색/알림 1행과 카테고리 2행의 모바일 헤더 구조 명확화
 * 2026.04.14  임도헌   Modified  spacer의 height 전환 애니메이션을 제거하고 기본 높이를 예약해 CLS/메인스레드 부담 완화
 * 2026.05.30  임도헌   Modified  모바일 게시글 필터 헤더의 상하 여백을 제품 헤더 밀도와 맞춰 압축
 */
"use client";

import NotificationBell from "@/components/global/NotificationBell";
import PostSearchBarWrapper from "@/features/post/components/PostSearchBarWrapper";
import PostCategoryTabs from "@/features/search/components/PostCategoryTabs";
import RegionFilterToggle from "@/features/search/components/RegionFilterToggle";
import MyLocationButton from "@/features/user/components/profile/MyLocationButton";
import { useHideableHeader } from "@/hooks/useHideableHeader";
import type { RegionRange } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const DEFAULT_MOBILE_HEADER_HEIGHT = 96;

interface PostMobileHeaderProps {
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
 * 게시글 탭 모바일 헤더
 *
 * [기능]
 * - 지역, 검색, 알림을 1행에서 제공
 * - 카테고리 탭을 2행에서 제공
 * - 스크롤 방향에 따라 헤더 hide/reveal 적용
 */
export default function PostMobileHeader({
  userId,
  unreadCount,
  currentCategory,
  userRegion1,
  userRegion2,
  userRegion3,
  currentRange,
  fullLocation,
}: PostMobileHeaderProps) {
  const { headerRef, headerHeight, isVisible } =
    useHideableHeader<HTMLElement>();

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          "fixed inset-x-0 top-0 z-30 border-b border-border-subtle bg-background px-3 pt-1.5 pb-1.5 shadow-sm transition-transform duration-300 ease-out"
        )}
        style={{
          transform: isVisible ? "translateY(0)" : "translateY(calc(-100% - 8px))",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="shrink-0">
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
          </div>

          <PostSearchBarWrapper
            className="flex-1"
            compact
            placeholder="게시글 검색"
          />

          <div className="shrink-0">
            <NotificationBell userId={userId} initialCount={unreadCount} />
          </div>
        </div>

        <div className="mt-1.5 rounded-xl border border-border-subtle bg-background">
          <PostCategoryTabs
            currentCategory={currentCategory}
            compact
            tone="neutral"
          />
        </div>
      </header>

      <div
        aria-hidden="true"
        className="grid overflow-hidden"
        style={{
          gridTemplateRows: isVisible
            ? `${Math.max(headerHeight, DEFAULT_MOBILE_HEADER_HEIGHT)}px`
            : "0px",
        }}
      >
        <div />
      </div>
    </>
  );
}
