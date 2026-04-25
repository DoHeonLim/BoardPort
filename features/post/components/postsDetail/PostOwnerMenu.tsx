/**
 * File Name : features/post/components/postsDetail/PostOwnerMenu.tsx
 * Description : 게시글 상세 owner 전용 관리 메뉴
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.06  임도헌   Created   게시글 상세의 수정/삭제 액션을 상단 관리 메뉴로 통합
 * 2026.04.08  임도헌   Modified  삭제 후 목록 진입 문맥이면 back + posts 목록 refresh로 복귀하도록 보강
 * 2026.04.24  임도헌   Modified  navigation refresh helper 기준으로 삭제 후 back 복귀 플래그 기록 중복을 정리
 */
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  EllipsisVerticalIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import BottomSheet from "@/components/global/BottomSheet";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { deletePostAction } from "@/features/post/actions/delete";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  canUseBrowserBack,
  markNavigationRefresh,
  NAVIGATION_REFRESH_ROOT_ID,
  NAVIGATION_REFRESH_SCOPES,
} from "@/lib/navigationRefreshFlag";

interface PostOwnerMenuProps {
  postId: number;
  editHref: string;
  nextAfterDelete: string;
  preferHistoryBack?: boolean;
}

/**
 * 게시글 상세 owner 전용 관리 메뉴
 *
 * [기능]
 * - 상단 메뉴 버튼 하나로 수정/삭제 액션 제공
 * - 모바일은 BottomSheet, 데스크톱은 드롭다운 메뉴 사용
 * - 목록/이전 화면 문맥에서 진입한 상세 삭제는 history back으로 기존 엔트리를 재사용
 * - 게시글 목록 문맥은 세션 refresh 플래그를 1회 소비해 stale list를 보정
 * - 직접 진입처럼 안전한 back 대상이 없을 때만 `nextAfterDelete` 기준으로 replace 복귀
 */
export default function PostOwnerMenu({
  postId,
  editHref,
  nextAfterDelete,
  preferHistoryBack = false,
}: PostOwnerMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // 데스크톱 드롭다운만 외부 클릭으로 닫고, 모바일 BottomSheet는 자체 닫기 UX 사용
  useEffect(() => {
    if (isMobile) return;

    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isMobile, isOpen]);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deletePostAction(postId);

        if (!result.success) {
          toast.error(result.error ?? "게시글 삭제에 실패했습니다.");
          return;
        }

        toast.success("게시글이 삭제되었습니다.");
        setConfirmOpen(false);
        setIsOpen(false);

        if (preferHistoryBack && canUseBrowserBack()) {
          // 게시글 목록 문맥은 back 전에 flag를 남겨 복귀 후 stale list 보정
          if (nextAfterDelete.startsWith("/posts")) {
            markNavigationRefresh(
              NAVIGATION_REFRESH_SCOPES.POSTS_LIST,
              NAVIGATION_REFRESH_ROOT_ID
            );
          }
          router.back();
          return;
        }

        router.replace(nextAfterDelete);
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error("게시글 삭제 중 오류가 발생했습니다.");
      }
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="게시글 관리 메뉴 열기"
        aria-expanded={isOpen}
        aria-haspopup={isMobile ? "dialog" : "menu"}
        className="focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary"
      >
        <EllipsisVerticalIcon className="size-5" />
      </button>

      {!isMobile && isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border border-border-subtle bg-background shadow-xl z-50"
        >
          <Link
            href={editHref}
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="focus-ring-soft flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-primary hover:bg-surface-dim"
          >
            <PencilSquareIcon className="size-4" />
            수정하기
          </Link>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setConfirmOpen(true);
            }}
            role="menuitem"
            className="focus-ring-soft flex w-full items-center gap-2 border-t border-border-subtle px-4 py-3 text-left text-sm font-medium text-danger hover:bg-danger/10 dark:hover:bg-danger/20"
          >
            <TrashIcon className="size-4" />
            삭제하기
          </button>
        </div>
      )}

      <BottomSheet
        open={isMobile && isOpen}
        title="게시글 관리"
        description="수정 또는 삭제를 진행할 수 있습니다."
        onClose={() => setIsOpen(false)}
      >
        <div className="space-y-2 pt-2">
          <Link
            href={editHref}
            onClick={() => setIsOpen(false)}
            className="focus-ring-soft flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
          >
            <PencilSquareIcon className="size-5 shrink-0" />
            수정하기
          </Link>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setConfirmOpen(true);
            }}
            className="focus-ring-soft flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            <TrashIcon className="size-5 shrink-0" />
            삭제하기
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmOpen}
        title="게시글을 삭제할까요?"
        description="삭제한 게시글은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
        loading={isPending}
      />
    </div>
  );
}
