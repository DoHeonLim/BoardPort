/**
 * File Name : features/user/components/profile/BlockedUsersModal.tsx
 * Description : 차단한 유저 리스트 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.04  임도헌   Created
 * 2026.02.26  임도헌   Modified  차단 해제 텍스트 버튼 다크모드 가시성 수정
 * 2026.03.06  임도헌   Modified  닫기 버튼 접근성과 터치 타겟을 공통 규칙에 맞게 보강
 * 2026.03.19  임도헌   Modified  모달 재오픈 또는 서버 목록 변경 시 차단 유저 로컬 상태를 즉시 재동기화
 * 2026.03.22  임도헌   Modified  최근 모달 톤 기준으로 외곽선과 헤더/푸터 보더 강도 정리
 * 2026.04.10  임도헌   Modified  profile 타이포 정책에 맞춰 차단 해제 액션 weight를 500 기준으로 정리
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.04.22  임도헌   Modified  차단 해제 액션을 텍스트 링크 대신 명확한 보조 버튼으로 정리
 * 2026.04.26  임도헌   Modified  차단 관리 모달에 dialog 의미와 제목 연결, ESC 닫기 포커스 흐름을 보강
 * 2026.05.17  임도헌   Modified  차단 유저 아이템 타입을 user types 공용 타입으로 이동
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { toggleBlockAction } from "@/features/user/actions/block";
import UserAvatar from "@/components/global/UserAvatar";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { BlockedUserSummary } from "@/features/user/types";

/**
 * 차단한 선원(유저) 관리 모달
 *
 * [기능]
 * 1. 내가 차단한 유저 목록을 조회하여 표시함
 * 2. '차단 해제' 버튼을 통해 즉시 차단을 풀고 목록에서 제거함
 * 3. 목록이 비어있을 경우 빈 상태(Empty State)를 표시함
 */
export default function BlockedUsersModal({
  isOpen,
  onClose,
  initialBlockedUsers,
  loading = false,
  onUsersChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialBlockedUsers: BlockedUserSummary[];
  loading?: boolean;
  onUsersChange?: (users: BlockedUserSummary[]) => void;
}) {
  const [users, setUsers] = useState(initialBlockedUsers);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 모달 재오픈이나 서버 목록 변경 뒤에는 낙관 상태보다 최신 서버 목록을 우선 반영
    setUsers(initialBlockedUsers);
  }, [initialBlockedUsers, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isPending, onClose]);

  if (!isOpen) return null;

  const handleUnblock = (targetId: number, username: string) => {
    startTransition(async () => {
      const res = await toggleBlockAction(targetId, "unblock");
      if (res.success) {
        setUsers((prev) => {
          const nextUsers = prev.filter((u) => u.blocked.id !== targetId);
          onUsersChange?.(nextUsers);
          return nextUsers;
        });
        toast.success(`${username}님 차단을 해제했습니다.`);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="blocked-users-title"
        tabIndex={-1}
        className="bg-surface w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border-subtle"
      >
        <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-surface">
          <h2 id="blocked-users-title" className="font-bold text-primary">
            차단한 선원 관리
          </h2>
          <button
            onClick={onClose}
            type="button"
            aria-label="차단한 선원 관리 모달 닫기"
            className={cn(
              "focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors",
              "text-muted hover:bg-surface-dim hover:text-primary"
            )}
          >
            <XMarkIcon className="size-6 text-muted" />
          </button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="size-6 animate-spin rounded-full border-2 border-brand/25 border-t-brand dark:border-brand-light/25 dark:border-t-brand-light" />
              <p className="mt-3 text-sm text-muted">
                차단한 선원 목록을 불러오는 중...
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted text-sm">차단한 선원이 없습니다.</p>
            </div>
          ) : (
            users.map((u) => (
              <div
                key={u.blocked.id}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-dim transition-colors"
              >
                <UserAvatar
                  username={u.blocked.username}
                  avatar={u.blocked.avatar}
                  size="sm"
                />
                <button
                  onClick={() =>
                    handleUnblock(u.blocked.id, u.blocked.username)
                  }
                  disabled={isPending}
                  className={cn(
                    "focus-ring-soft inline-flex min-h-[36px] items-center justify-center rounded-full border px-3 text-xs font-medium transition-colors",
                    "border-border-subtle bg-surface text-brand hover:bg-surface-dim hover:text-brand-dark",
                    "dark:text-brand-light dark:hover:text-white disabled:opacity-50"
                  )}
                >
                  차단 해제
                </button>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-border-subtle bg-surface flex justify-end">
          <button
            onClick={onClose}
            className="btn-secondary-modal h-10 px-6 text-sm font-medium"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
