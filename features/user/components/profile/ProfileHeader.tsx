/**
 * File Name : features/user/components/profile/ProfileHeader.tsx
 * Description : 프로필 상단 헤더 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.11.10  임도헌   Created    MyProfile 헤더 UI를 공용 컴포넌트로 분리
 * 2025.11.18  임도헌   Modified   xl 미만에서 아바타/평점 사이즈 축소
 * 2025.12.12  임도헌   Modified   matchMedia change 이벤트 Safari 폴백(addListener) 추가
 * 2025.12.14  임도헌   Modified   ProfileHeader에 onFollowingChange prop 추가 → FollowSection으로 전달
 * 2025.12.20  임도헌   Modified   rail CTA 지원: followButtonId prop 추가 → FollowSection 버튼 id 주입
 * 2026.01.15  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용, 레이아웃 그리드화, 반응형 사이즈 조정
 * 2026.01.17  임도헌   Moved     components/profile -> features/user/components/profile
 * 2026.01.29  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */

"use client";

import { useEffect, useState } from "react";
import TimeAgo from "@/components/ui/TimeAgo";
import UserAvatar from "@/components/global/UserAvatar";
import UserRating from "@/features/user/components/profile/UserRating";
import FollowSection from "@/features/user/components/follow/FollowSection";
import type { ProfileAverageRating } from "@/features/user/types";

type Props = {
  ownerId: number;
  ownerUsername: string;
  createdAt: string | Date;
  averageRating: ProfileAverageRating | null; //평점 요약(없으면 0/0으로 표기)
  followerCount: number; //서버 카운트
  followingCount: number;
  viewerId?: number; //뷰어/팔로우 초기값
  initialIsFollowing?: boolean;
  avatarUrl?: string | null; //아바타 URL
  onRequireLogin?: () => void; //로그인 요구시 동작
  className?: string;
  showFollowButton?: boolean; //내 프로필이 아니라면 true로 넘겨 버튼 노출
  onFollowingChange?: (now: boolean) => void;
  followButtonId?: string; // 팔로우 버튼 DOM id(rail에서 클릭 유도용)
  isBlocked?: boolean; // 차단했는가?
};

/**
 * 프로필/채널 상단 헤더
 *
 * [기능]
 * 1. 유저 기본 정보(아바타, 이름, 가입일)를 표시
 * 2. `FollowSection`을 포함하여 팔로워/팔로잉 통계 및 버튼을 제공
 * 3. 반응형 디자인: 화면 크기(sm breakpoint)에 따라 아바타 및 평점 크기를 조절
 */
export default function ProfileHeader({
  ownerId,
  ownerUsername,
  createdAt,
  averageRating,
  followerCount,
  followingCount,
  viewerId,
  initialIsFollowing,
  avatarUrl,
  onRequireLogin,
  showFollowButton = true,
  onFollowingChange,
  followButtonId,
  isBlocked,
  className,
}: Props) {
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  // 반응형 체크 (sm: 640px 이상)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () => setIsLargeScreen(mq.matches);
    apply(); // 초기값 설정

    // 이벤트 리스너 등록
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const avatarSize = isLargeScreen ? "lg" : "md";
  const ratingSize = isLargeScreen ? "md" : "sm";

  return (
    <div className={className}>
      <div className="flex items-start gap-4">
        {/* 1. 아바타 영역 */}
        <div className="my-auto">
          <UserAvatar
            avatar={avatarUrl ?? undefined}
            username={ownerUsername}
            size={avatarSize}
            showUsername={false}
            disabled
            className="ring-1 ring-border shadow-sm bg-surface shrink-0"
          />
        </div>

        {/* 2. 정보 영역 (우측) */}
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex flex-col gap-1.5">
            {/* 2-1. 이름 */}
            <h1 className="text-lg sm:text-xl font-bold text-primary truncate leading-tight">
              {ownerUsername}
            </h1>

            {/* 2-2. 메타 정보 (가입일 + 별점) */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <div className="flex items-center gap-1.5">
                <span>가입일</span>
                <TimeAgo date={createdAt} className="text-muted" />
              </div>
              <div className="w-px h-3 bg-border" aria-hidden="true" />
              <UserRating
                average={averageRating?.averageRating ?? 0}
                totalReviews={averageRating?.reviewCount ?? 0}
                size={ratingSize}
              />
            </div>

            {/* 2-3. 팔로우 섹션 (통계 + 버튼) */}
            <div className="mt-1">
              <FollowSection
                ownerId={ownerId}
                ownerUsername={ownerUsername}
                initial={{
                  isFollowing: !!initialIsFollowing,
                  followerCount,
                  followingCount,
                }}
                viewer={{ id: viewerId }}
                showButton={showFollowButton}
                size="compact"
                align="start"
                onRequireLogin={onRequireLogin}
                onFollowingChange={onFollowingChange}
                followButtonId={followButtonId}
                isBlocked={isBlocked}
                className="gap-x-4 gap-y-2"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
