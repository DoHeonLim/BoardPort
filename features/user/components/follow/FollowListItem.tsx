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
 * 2026.01.29  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.26  임도헌   Modified  다크모드에서 Outline 버튼 가시성(brand-light) 개선
 * 2026.03.28  임도헌   Modified  팔로우 리스트 행을 카드형으로 정리하고 버튼 무게를 조정해 프로필 모달 밀도 개선
 * 2026.03.29  임도헌   Modified  행 레이아웃을 리스트 문법으로 되돌려 아바타/닉네임을 좌정렬하고 과한 보더를 제거
 * 2026.03.29  임도헌   Modified  팔로우 CTA를 outline 대신 채움형으로 조정해 모달 내 가시성 보강
 * 2026.04.26  임도헌   Modified  팔로우 목록 CTA와 맞팔로잉 CTA의 다크모드 색조를 primary CTA 톤과 맞춰 정리
 * 2026.06.17  임도헌   Modified  row 팔로우 버튼도 pending 동안 선반영 상태로 표시
 */

"use client";

import UserAvatar from "@/components/global/UserAvatar";
import type { FollowListUser } from "@/features/user/types";
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

/**
 * 팔로우 목록의 개별 유저 아이템
 *
 * - 유저 아바타와 이름을 표시
 * - 본인이 아닐 경우 팔로우/언팔로우 버튼을 노출
 * - 본인일 경우 '나' 뱃지를 표시
 * - 버튼 상태는 `user.isFollowedByViewer`를 기준으로 렌더링
 */
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
  const displayFollowing = pending ? !following : following;

  const handleClick = async () => {
    if (!onToggle || pending) return;
    await onToggle(user.id);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-dim/35">
      <div className="flex min-w-0 flex-1 items-center">
        <UserAvatar
          username={user.username}
          avatar={user.avatar}
          size="sm"
          compact
          className="w-full justify-start shrink-0"
        />
      </div>

      {showButton && !isMe ? (
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          aria-busy={pending}
          aria-pressed={displayFollowing}
          className={cn(
            "focus-ring-soft inline-flex h-8 min-w-[86px] items-center justify-center px-3 text-xs font-medium rounded-lg transition-colors border shrink-0",
            "disabled:cursor-not-allowed",
            displayFollowing
              ? "bg-surface text-muted border-border-subtle hover:bg-surface-dim hover:border-border dark:bg-surface-dim dark:text-primary dark:border-border dark:hover:bg-border/40" // Unfollow
              : buttonVariant === "primary"
                ? "bg-brand text-white border-transparent hover:bg-brand-dark dark:bg-brand dark:text-white dark:hover:bg-brand-dark" // Primary Follow
                : "bg-brand text-white border-transparent hover:bg-brand-dark dark:bg-brand dark:text-white dark:hover:bg-brand-dark"
          )}
        >
          {displayFollowing ? "팔로우 취소" : "팔로우"}
        </button>
      ) : isMe ? (
        <span className="inline-flex h-8 min-w-[44px] items-center justify-center rounded-lg border border-border-subtle bg-surface-dim px-2.5 text-xs font-medium text-muted">
          나
        </span>
      ) : null}
    </div>
  );
}
