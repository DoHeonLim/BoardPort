/**
 * File Name : features/post/components/postsDetail/PostDetailTopbar.tsx
 * Description : 게시글 상세 상단바(뒤로가기 + 카테고리 + 작성자 + 관리/옵션 메뉴)
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
 * 2026.03.06  임도헌   Modified  모바일 옵션 메뉴를 Bottom Sheet로 전환하고 액션 버튼 접근성을 보강
 * 2026.03.06  임도헌   Modified  상세 상단 액션바 버튼/칩 스타일을 공통 규칙으로 통일
 * 2026.03.13  임도헌   Modified  작성자 차단 성공 후 returnTo 또는 목록 fallback 경로로 복귀하도록 보강
 * 2026.03.14  임도헌   Modified  게시글 상세 상단바를 flat 헤더 톤으로 정리하고 subtle 보더 기준으로 통일
 * 2026.03.17  임도헌   Modified  작은 모바일 화면에서는 카테고리 칩을 헤더에서 숨겨 작성자 정보 과밀을 완화
 * 2026.03.18  임도헌   Modified  비채팅 returnTo 문맥의 detail-edit 복귀 경로와 차단 이동 흐름을 정리하고 중복 router.refresh를 제거
 * 2026.04.01  임도헌   Modified  게시글 detail-edit 진입과 저장/취소 복귀 문맥을 다시 정리해 상세 히스토리 우선 흐름을 보강
 * 2026.03.19  임도헌   Modified  공유 버튼을 보조 액션으로 읽히도록 시각적 강조를 한 단계 낮춤
 * 2026.03.27  임도헌   Modified  작성자용 수정 버튼의 경계 대비와 크기를 조정해 라이트/다크 헤더 균형을 보강
 * 2026.04.03  임도헌   Modified  작성자 차단 확인 문구를 다른 도메인과 같은 전역 차단 정책 톤으로 정리
 * 2026.04.06  임도헌   Modified  작성자용 수정/삭제를 상단 owner 관리 메뉴로 통합
 */
"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import BackButton from "@/components/global/BackButton";
import BottomSheet from "@/components/global/BottomSheet";
import UserAvatar from "@/components/global/UserAvatar";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { toggleBlockAction } from "@/features/user/actions/block";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  ShareIcon,
  EllipsisVerticalIcon,
  UserMinusIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { POST_CATEGORY, PostCategoryType } from "@/features/post/constants";
import { cn, handleShare } from "@/lib/utils";
import PostOwnerMenu from "@/features/post/components/postsDetail/PostOwnerMenu";

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
  preferHistoryBack?: boolean;
}

/**
 * 게시글 상세 상단바
 * 뒤로가기, 작성자 정보, 카테고리, 공유/옵션 액션, 작성자용 관리 메뉴를 한 곳에서 관리하는 sticky 헤더.
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
  preferHistoryBack = false,
}: PostDetailTopbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // 외부 클릭 닫기
  useEffect(() => {
    if (isMobile) return;

    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isMobile, menuOpen]);

  const handleBlock = () => {
    startTransition(async () => {
      const nextHref = backHref ?? "/posts";

      // 1. 차단 실행
      const result = await toggleBlockAction(authorId, "block", nextHref);

      if (result.success) {
        toast.success(`${authorUsername}님을 차단했습니다.`);
        // 2. 차단 후에는 원래 보던 목록 경로로 복귀
        router.replace(nextHref);
      } else {
        toast.error(result.error);
      }
      setBlockConfirmOpen(false);
      setMenuOpen(false);
    });
  };

  const categoryLabel = category && POST_CATEGORY[category as PostCategoryType];
  const nextAfterDelete =
    backHref && !backHref.startsWith("/chats/") ? backHref : "/posts";

  return (
    <header className="sticky top-0 z-40 w-full h-14 border-b border-border-subtle bg-background shadow-sm transition-colors">
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
                "appbar-chip mr-2 hidden sm:inline-flex",
                "bg-brand/10 text-brand dark:bg-brand-light/50 dark:text-gray-100"
              )}
            >
              {categoryLabel}
            </span>
          )}
          <button
            onClick={() => handleShare(title)}
            className="appbar-icon-btn focus-ring-soft text-muted/80 hover:bg-surface-dim/70"
            aria-label="게시글 공유하기"
          >
            <ShareIcon className="size-5" />
          </button>

          {canEdit ? (
            <PostOwnerMenu
              postId={postId}
              editHref={editHref!}
              nextAfterDelete={nextAfterDelete}
              preferHistoryBack={preferHistoryBack}
            />
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="게시글 옵션 열기"
                aria-expanded={menuOpen}
                aria-haspopup={isMobile ? "dialog" : "menu"}
                className="focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary"
              >
                <EllipsisVerticalIcon className="size-5" />
              </button>

              {!isMobile && menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-border-subtle bg-background shadow-xl z-50"
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setBlockConfirmOpen(true);
                    }}
                    role="menuitem"
                    className="focus-ring-soft flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-danger hover:bg-danger/5"
                  >
                    <UserMinusIcon className="size-4" />
                    작성자 차단하기
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setReportOpen(true);
                    }}
                    role="menuitem"
                    className="focus-ring-soft flex w-full items-center gap-2 border-t border-border-subtle px-4 py-3 text-left text-sm font-medium text-primary hover:bg-surface-dim"
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

      <BottomSheet
        open={isMobile && menuOpen}
        title="게시글 옵션"
        description="작성자 차단 또는 게시글 신고를 진행할 수 있습니다."
        onClose={() => setMenuOpen(false)}
      >
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setBlockConfirmOpen(true);
            }}
            className="focus-ring-soft flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            <UserMinusIcon className="size-5 shrink-0" />
            작성자 차단하기
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setReportOpen(true);
            }}
            className="focus-ring-soft flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
          >
            <ExclamationTriangleIcon className="size-5 shrink-0" />
            게시글 신고하기
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={blockConfirmOpen}
        title="유저 차단"
        description={`${authorUsername}님을 차단하시겠습니까? 차단하면 전역 차단 관계가 생성되고, 서로의 글과 채팅을 볼 수 없으며 팔로우가 취소됩니다.`}
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
