/**
 * File Name : features/stream/components/channel/UserChannelHeader.tsx
 * Description : 방송국 헤더 (프로필 + 팔로우 섹션)
 * Author : 임도헌
 *
 * History
 * 2025.08.09  임도헌   Created
 * 2025.09.09  임도헌   Modified  팔로우 버튼 클릭/대기상태 로깅
 * 2025.10.14  임도헌   Modified  FollowSection 내장, 콜백/상태 관리 제거
 * 2025.11.10  임도헌   Modified  변경된 FollowSection에 맞게 수정
 * 2026.01.14  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */
"use client";

import Link from "next/link";
import UserAvatar from "@/components/global/UserAvatar";
import FollowSection from "@/features/user/components/follow/FollowSection";
import { cn } from "@/lib/utils";

interface Props {
  ownerId: number;
  username: string;
  avatar?: string | null;

  initialFollowerCount: number;
  initialFollowingCount: number;
  initialIsFollowing: boolean;

  isMe: boolean;
  viewerId?: number;

  onRequireLogin?: () => void;
  onFollowingChange?: (now: boolean) => void;
}

/**
 * 방송국 상단 헤더 컴포넌트
 *
 * - 스트리머의 프로필 정보(아바타, 이름)를 표시합니다.
 * - `FollowSection`을 포함하여 팔로워 수/팔로우 버튼을 제공합니다.
 * - 일반 프로필 페이지로 이동하는 링크를 제공합니다.
 */
export default function UserChannelHeader({
  ownerId,
  username,
  avatar,
  initialFollowerCount,
  initialFollowingCount,
  initialIsFollowing,
  isMe,
  viewerId,
  onRequireLogin,
  onFollowingChange,
}: Props) {
  return (
    <div className="mx-auto max-w-3xl w-full px-4 pt-6 pb-6">
      <div className="flex items-center gap-4 mb-6">
        <UserAvatar
          username={username}
          avatar={avatar}
          size="lg"
          className="ring-2 ring-background shadow-sm"
        />

        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-primary truncate">
              {username}
            </h1>
            <div className="flex items-center gap-3">
              <FollowSection
                ownerId={ownerId}
                ownerUsername={username}
                initial={{
                  isFollowing: !!initialIsFollowing,
                  followerCount: initialFollowerCount,
                  followingCount: initialFollowingCount,
                }}
                viewer={{ id: viewerId }}
                showButton={!isMe}
                size="compact"
                align="start"
                onRequireLogin={onRequireLogin}
                onFollowingChange={onFollowingChange}
                followButtonId="channel-follow-button"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Link
          href={`/profile/${username}`}
          className={cn(
            "w-full max-w-sm flex items-center justify-center py-2.5 rounded-xl transition-colors",
            "bg-surface text-sm font-medium text-primary border border-border hover:bg-surface-dim shadow-sm"
          )}
        >
          프로필 보러가기
        </Link>
      </div>
    </div>
  );
}
