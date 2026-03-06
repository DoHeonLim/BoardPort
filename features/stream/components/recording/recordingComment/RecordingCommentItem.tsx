/**
 * File Name : features/stream/components/recording/recordingComment/RecordingCommentItem.tsx
 * Description : 녹화본 단일 댓글 아이템
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.04  임도헌   Created   댓글 아이템 렌더링 및 삭제 기능 추가
 * 2025.08.05  임도헌   Modified  삭제 로직 props 전달 방식으로 변경
 * 2025.08.05  임도헌   Modified  RecordingCommentDeleteButton 적용
 * 2026.01.14  임도헌   Modified  Compact 레이아웃 및 forwardRef 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.06  임도헌   Modified  녹화본 댓글에 차단 및 신고 메뉴(Dropdown) 추가
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.06  임도헌   Modified  댓글 옵션 메뉴 접근성과 hover 대비를 UI/UX 표준에 맞게 보강
 */
"use client";

import { forwardRef, useState, useRef, useEffect, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import UserAvatar from "@/components/global/UserAvatar";
import TimeAgo from "@/components/ui/TimeAgo";
import RecordingCommentDeleteButton from "@/features/stream/components/recording/recordingComment/RecordingCommentDeleteButton";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { toggleBlockAction } from "@/features/user/actions/block";
import { StreamComment } from "@/features/stream/types";
import {
  EllipsisHorizontalIcon,
  UserMinusIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const ReportModal = dynamic(
  () => import("@/features/report/components/ReportModal"),
  { ssr: false }
);

interface RecordingCommentItemProps {
  vodId: number;
  comment: StreamComment;
  currentUserId: number;
}

/**
 * 녹화본 개별 댓글 렌더링 컴포넌트
 *
 * [상태 제어 및 애니메이션 로직]
 * - 작성자 정보(Avatar, Username), 작성 시간, 내용을 포맷팅하여 렌더링
 * - 본인 댓글일 경우 삭제 버튼(`RecordingCommentDeleteButton`) 노출
 * - 타인 댓글일 경우 더보기 메뉴를 통한 차단(`toggleBlockAction`) 및 신고(`ReportModal`) 연동
 * - `AnimatePresence` 동작 지원을 위한 `forwardRef` 주입 및 Framer Motion 기반 등장/퇴장 애니메이션 적용
 */
const RecordingCommentItem = forwardRef<
  HTMLDivElement,
  RecordingCommentItemProps
>(({ vodId, comment, currentUserId }, ref) => {
  const isOwner = comment.user.id === currentUserId;

  // 상태 관리
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  //  차단 핸들러
  const handleBlock = () => {
    startTransition(async () => {
      const result = await toggleBlockAction(comment.user.id, "block");
      if (result.success) {
        toast.success(`${comment.user.username}님을 차단했습니다.`);
        setBlockConfirmOpen(false);
        setMenuOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3 py-3 border-b border-border last:border-none group"
    >
      <UserAvatar
        avatar={comment.user.avatar}
        username={comment.user.username}
        size="sm"
        showUsername={false}
        className="mt-0.5 shrink-0"
        compact
      />

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start leading-none">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary">
              {comment.user.username}
            </span>
            <span className="text-xs text-muted">
              <TimeAgo date={comment.created_at.toString()} />
            </span>
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-1">
            {isOwner ? (
              <RecordingCommentDeleteButton
                vodId={vodId}
                commentId={comment.id}
              />
            ) : (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="녹화 댓글 옵션"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-dim hover:text-primary"
                >
                  <EllipsisHorizontalIcon className="size-5" />
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-1 w-40 bg-surface rounded-xl shadow-xl border border-border z-50 overflow-hidden animate-fade-in"
                  >
                    <button
                      onClick={() => setBlockConfirmOpen(true)}
                      role="menuitem"
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-primary hover:bg-surface-dim flex items-center gap-2 transition-colors"
                    >
                      <UserMinusIcon className="size-4" />
                      작성자 차단
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setReportOpen(true);
                      }}
                      role="menuitem"
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/5 flex items-center gap-2 border-t border-border transition-colors"
                    >
                      <ExclamationTriangleIcon className="size-4" />
                      댓글 신고
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="mt-1 text-sm text-primary leading-relaxed break-words whitespace-pre-wrap">
          {comment.payload}
        </p>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={blockConfirmOpen}
        title="유저 차단"
        description={`${comment.user.username}님을 차단하시겠습니까?`}
        confirmLabel="차단"
        onConfirm={handleBlock}
        onCancel={() => setBlockConfirmOpen(false)}
        loading={isPending}
      />

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetId={comment.id}
        targetType="COMMENT"
      />
    </motion.div>
  );
});

RecordingCommentItem.displayName = "RecordingCommentItem";

export default RecordingCommentItem;
