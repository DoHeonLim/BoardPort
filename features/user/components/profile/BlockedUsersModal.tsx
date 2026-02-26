/**
 * File Name : features/user/components/profile/BlockedUsersModal.tsx
 * Description : 차단한 유저 리스트 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.04  임도헌   Created
 * 2026.02.26  임도헌   Modified  차단 해제 텍스트 버튼 다크모드 가시성 수정
 */
"use client";

import { useState, useTransition } from "react";
import { toggleBlockAction } from "@/features/user/actions/block";
import UserAvatar from "@/components/global/UserAvatar";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface BlockedUser {
  blocked: { id: number; username: string; avatar: string | null };
}

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
}: {
  isOpen: boolean;
  onClose: () => void;
  initialBlockedUsers: BlockedUser[];
}) {
  const [users, setUsers] = useState(initialBlockedUsers);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleUnblock = (targetId: number, username: string) => {
    startTransition(async () => {
      const res = await toggleBlockAction(targetId, "unblock");
      if (res.success) {
        setUsers((prev) => prev.filter((u) => u.blocked.id !== targetId));
        toast.success(`${username}님 차단을 해제했습니다.`);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border animate-fade-in">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-dim/30">
          <h2 className="font-bold text-primary">차단한 선원 관리</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black/5 rounded-full transition-colors"
          >
            <XMarkIcon className="size-6 text-muted" />
          </button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
          {users.length === 0 ? (
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
                  className="text-xs font-semibold text-brand dark:text-brand-light hover:text-brand-dark dark:hover:text-white underline underline-offset-2 disabled:opacity-50 transition-colors"
                >
                  차단 해제
                </button>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-border bg-surface-dim/30 flex justify-end">
          <button onClick={onClose} className="btn-secondary h-10 text-sm px-6">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
