/**
 * File Name : features/post/components/postDetail/PostDetailTopbar.tsx
 * Description : 게시글 상세 상단바(뒤로가기 + 카테고리 + 작성자 + 수정 버튼)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.13  임도헌   Created   상세 상단바 분리(레이아웃 의존 제거)
 * 2025.11.13  임도헌   Modified  작성자 정보/수정 버튼 Topbar로 이관
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 스타일 통일
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.02.05  임도헌   Modified  신고 및 작성자 차단 통합 메뉴 구현
 * 2026.02.13  임도헌   Modified  상단바에 공유하기 버튼 추가
 * 2026.02.26  임도헌   Modified  카테고리 UI 수정
 */
"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import BackButton from "@/components/global/BackButton";
import UserAvatar from "@/components/global/UserAvatar";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { toggleBlockAction } from "@/features/user/actions/block";
import {
  ShareIcon,
  PencilSquareIcon,
  EllipsisVerticalIcon,
  UserMinusIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { POST_CATEGORY, PostCategoryType } from "@/features/post/constants";
import { cn, handleShare } from "@/lib/utils";

const ReportModal = dynamic(
  () => import("@/features/report/components/ReportModal"),
  { ssr: false }
);

interface PostDetailTopbarProps {
  postId: number;
  title: string;
  authorId: number;
  authorUsername: string;
  authorAvatar?: string | null;
  category?: string | null;
  backHref?: string;
  canEdit?: boolean;
  editHref?: string;
}

/**
 * 게시글 상세 상단바
 * - 좌측: 뒤로가기 버튼 + 작성자 프로필 (Avatar + Name)
 * - 우측: 카테고리 칩 + (작성자인 경우) 수정 버튼
 * - 스크롤 시 상단에 고정(Sticky
 */
export default function PostDetailTopbar({
  postId,
  title,
  authorId,
  authorUsername,
  authorAvatar,
  category,
  backHref,
  canEdit,
  editHref,
}: PostDetailTopbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 닫기
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const handleBlock = () => {
    startTransition(async () => {
      // 1. 차단 실행
      const result = await toggleBlockAction(authorId, "block");

      if (result.success) {
        toast.success(`${authorUsername}님을 차단했습니다.`);
        // 2. 차단했으므로 더 이상 이 글을 볼 수 없음 -> 목록으로 이동
        router.replace("/posts");
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setBlockConfirmOpen(false);
      setMenuOpen(false);
    });
  };

  const categoryLabel = category && POST_CATEGORY[category as PostCategoryType];

  return (
    <header className="sticky top-0 z-40 w-full h-14 bg-surface/80 backdrop-blur-md border-b border-border transition-colors">
      <div className="mx-auto w-full max-w-mobile h-full flex items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <BackButton
            fallbackHref={backHref ?? "/posts"}
            variant="appbar"
            className="px-0"
          />
          <UserAvatar
            username={authorUsername}
            avatar={authorAvatar ?? null}
            size="sm"
            compact
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {categoryLabel && (
            <span
              className={cn(
                "inline-flex px-3 py-1 text-xs font-medium rounded-full mr-2 transition-colors",
                "bg-brand/10 text-brand dark:bg-brand-light/50 dark:text-gray-100"
              )}
            >
              {categoryLabel}
            </span>
          )}
          <button
            onClick={() => handleShare(title)}
            className="p-2 text-muted hover:text-primary rounded-full hover:bg-surface-dim transition-colors"
            aria-label="게시글 공유하기"
          >
            <ShareIcon className="size-5" />
          </button>

          {canEdit ? (
            <Link
              href={editHref!}
              className="flex items-center justify-center btn-secondary h-9 px-3 text-xs gap-1.5 border-none bg-surface-dim hover:bg-border text-muted hover:text-primary"
            >
              <PencilSquareIcon className="size-4" />
              <span>수정</span>
            </Link>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-muted hover:text-primary transition-colors rounded-full hover:bg-surface-dim"
              >
                <EllipsisVerticalIcon className="size-5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-surface rounded-xl shadow-xl border border-border z-50 overflow-hidden animate-fade-in">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setBlockConfirmOpen(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-danger hover:bg-danger/5 flex items-center gap-2"
                  >
                    <UserMinusIcon className="size-4" />
                    작성자 차단하기
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setReportOpen(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-primary hover:bg-surface-dim flex items-center gap-2 border-t border-border"
                  >
                    <ExclamationTriangleIcon className="size-4" />
                    게시글 신고하기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={blockConfirmOpen}
        title="유저 차단"
        description={`${authorUsername}님을 차단하시겠습니까? 차단 시 서로의 게시글을 볼 수 없습니다.`}
        confirmLabel="차단"
        onConfirm={handleBlock}
        onCancel={() => setBlockConfirmOpen(false)}
        loading={isPending}
      />

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetId={postId}
        targetType="POST"
      />
    </header>
  );
}
