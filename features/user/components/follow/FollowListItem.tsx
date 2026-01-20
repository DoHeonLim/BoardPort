/**
 * File Name : features/user/components/follow/FollowListItem.tsx
 * Description : 팔로우 리스트 아이템 (SSOT: user.isFollowedByViewer만 신뢰)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.22  임도헌   Created
 * 2025.09.14  임도헌   Modified  a11y 보강, isMe 가드
 * 2025.10.14  임도헌   Modified  토글/로딩은 컨트롤러 단일 책임으로 이동
 * 2025.12.20  임도헌   Modified  로컬 following 제거(단일 소스화)
 * 2025.12.20  임도헌   Modified  a11yProps merge 순서 정리(aria-pressed/busy/label 보호)
 * 2026.01.05  임도헌   Modified  a11yProps.className 병합 + "나" 뱃지 조건 정교화
 * 2026.01.15  임도헌   Modified  [Rule 5.1] 버튼 스타일 세분화 및 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/follow -> features/user/components/follow
 */

"use client";

import UserAvatar from "@/components/global/UserAvatar";
import type { FollowListUser } from "@/types/profile";
import { cn } from "@/lib/utils";

interface FollowListItemProps {
  user: FollowListUser;
  viewerId?: number;
  /** 행 단위 pending */
  pending?: boolean;
  /** 버튼 노출 여부 */
  showButton?: boolean;
  /** 외부 컨트롤러 토글 핸들러(단일 책임) */
  onToggle?: (userId: number) => void | Promise<void>;
  buttonVariant?: "primary" | "outline";
}

export default function FollowListItem({
  user,
  viewerId,
  pending = false,
  showButton = true,
  onToggle,
  buttonVariant = "outline",
}: FollowListItemProps) {
  const isMe = viewerId != null && user.id === viewerId;
  const following = !!user.isFollowedByViewer;

  const handleClick = async () => {
    if (!onToggle || pending) return;
    await onToggle(user.id);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <UserAvatar
        username={user.username}
        avatar={user.avatar}
        size="sm"
        className="shrink-0"
      />

      {showButton && !isMe ? (
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          className={cn(
            "h-8 px-3 text-xs font-medium rounded-lg transition-all border shrink-0",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            following
              ? "bg-surface-dim text-muted border-border hover:bg-border/50" // Unfollow
              : buttonVariant === "primary"
                ? "bg-brand text-white border-transparent hover:bg-brand-dark" // Primary Follow
                : "bg-surface text-brand border-brand hover:bg-brand/5" // Outline Follow
          )}
        >
          {pending ? "..." : following ? "팔로잉" : "팔로우"}
        </button>
      ) : isMe ? (
        <span className="text-xs font-medium text-muted bg-surface-dim px-2 py-1 rounded-md">
          나
        </span>
      ) : null}
    </div>
  );
}
