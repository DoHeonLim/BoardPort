/**
 * File Name : components/profile/ProfileHeader
 * Description : 내/다른 유저 공용 프로필 헤더 — MyProfile 스타일로 통일
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
 */

"use client";

import { useEffect, useState } from "react";
import UserAvatar from "@/components/global/UserAvatar";
import TimeAgo from "@/components/ui/TimeAgo";
import UserRating from "@/components/profile/UserRating";
import FollowSection from "@/components/follow/FollowSection";
import type { ProfileAverageRating } from "@/types/profile";

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
};

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
  className,
}: Props) {
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)"); // sm breakpoint
    const apply = () => setIsLargeScreen(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const avatarSize = isLargeScreen ? "lg" : "md"; // 80px vs 48px
  const ratingSize = isLargeScreen ? "md" : "sm";

  return (
    <div className={className}>
      <div className="flex items-start gap-4 sm:gap-5">
        <UserAvatar
          avatar={avatarUrl ?? undefined}
          username={ownerUsername}
          size={avatarSize}
          showUsername={false}
          disabled
          className="ring-1 ring-border shadow-sm bg-surface shrink-0"
        />

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between">
              <h1 className="text-lg sm:text-xl font-bold text-primary truncate leading-tight">
                {ownerUsername}
              </h1>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted">
              <span>가입일</span>
              <TimeAgo date={createdAt} className="text-muted" />
            </div>

            <div className="mt-1.5">
              <UserRating
                average={averageRating?.averageRating ?? 0}
                totalReviews={averageRating?.reviewCount ?? 0}
                size={ratingSize}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 팔로우 섹션 (모바일에서 줄바꿈 고려해 별도 div) */}
      <div className="mt-4">
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
        />
      </div>
    </div>
  );
}
