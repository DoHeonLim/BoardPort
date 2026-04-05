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
 * 2026.03.08  임도헌   Modified  framer-motion 기반 댓글 애니메이션 제거
 * 2026.03.14  임도헌   Modified  모바일에서는 댓글 옵션 버튼이 항상 보이도록 조정해 신고/차단 접근성을 복구
 * 2026.03.18  임도헌   Modified  차단 성공 후 router.refresh 대신 녹화 댓글 쿼리 무효화로 국소 갱신
 * 2026.03.19  임도헌   Modified  작은 화면에서는 상단 메타와 옵션 메뉴를 2행으로 풀어 긴 닉네임과 액션 버튼 충돌을 완화
 * 2026.03.21  임도헌   Modified  댓글 항목 구분선을 subtle 톤으로 낮춰 녹화 상세 패널과 밀도 차이를 완화
 * 2026.04.03  임도헌   Modified  녹화 댓글 옵션을 게시글 댓글과 같은 모바일 BottomSheet / 데스크톱 드롭다운 문법으로 통일
 * 2026.04.03  임도헌   Modified  댓글 작성자 차단 확인 문구를 다른 도메인과 같은 전역 차단 정책 톤으로 정리
 */
"use client";

import { forwardRef, useState, useRef, useEffect, useTransition } from "react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import UserAvatar from "@/components/global/UserAvatar";
import TimeAgo from "@/components/ui/TimeAgo";
import BottomSheet from "@/components/global/BottomSheet";
import RecordingCommentDeleteButton from "@/features/stream/components/recording/recordingComment/RecordingCommentDeleteButton";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { toggleBlockAction } from "@/features/user/actions/block";
import { StreamComment } from "@/features/stream/types";
import { queryKeys } from "@/lib/queryKeys";
import { useIsMobile } from "@/hooks/useIsMobile";
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
 * - 차단 성공 시 녹화 댓글 쿼리만 무효화해 작성자 필터링을 국소 반영
 * - `forwardRef`를 주입하여 리스트 렌더링과 DOM 접근을 안정적으로 지원
 */
const RecordingCommentItem = forwardRef<
  HTMLDivElement,
  RecordingCommentItemProps
>(({ vodId, comment, currentUserId }, ref) => {
  const isOwner = comment.user.id === currentUserId;

  // 상태 관리
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const commentsQueryKey = queryKeys.streams.vodComments(vodId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    if (isMobile) return;

    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isMobile, menuOpen]);

  //  차단 핸들러
  const handleBlock = () => {
    startTransition(async () => {
      const result = await toggleBlockAction(comment.user.id, "block");
      if (result.success) {
        toast.success(`${comment.user.username}님을 차단했습니다.`);
        setBlockConfirmOpen(false);
        setMenuOpen(false);
        // 차단 관계가 반영된 녹화 댓글 목록만 다시 읽어 국소 갱신
        queryClient.invalidateQueries({ queryKey: commentsQueryKey });
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div
      ref={ref}
      className="group flex gap-3 border-b border-border-subtle py-3 last:border-none"
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
            <span className="min-w-0 truncate text-sm font-semibold text-primary">
              {comment.user.username}
            </span>
            <span className="text-xs text-muted">
              <TimeAgo date={comment.created_at.toString()} />
            </span>
          </div>

          <div className="flex items-center">
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
                  className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-dim hover:text-primary md:opacity-0 md:group-hover:opacity-100"
                >
                  <EllipsisHorizontalIcon className="size-5" />
                </button>

                {!isMobile && menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-xl"
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
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/5 flex items-center gap-2 border-t border-border-subtle transition-colors"
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

        <p className="text-sm text-primary leading-relaxed break-words whitespace-pre-wrap">
          {comment.payload}
        </p>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={blockConfirmOpen}
        title="유저 차단"
        description={`${comment.user.username}님을 차단하시겠습니까? 차단하면 전역 차단 관계가 생성되고, 서로의 글과 채팅을 볼 수 없으며 팔로우가 취소됩니다.`}
        confirmLabel="차단"
        onConfirm={handleBlock}
        onCancel={() => setBlockConfirmOpen(false)}
        loading={isPending}
      />

      <BottomSheet
        open={!isOwner && isMobile && menuOpen}
        title="댓글 옵션"
        description="작성자 차단 또는 댓글 신고를 진행할 수 있습니다."
        onClose={() => setMenuOpen(false)}
      >
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setBlockConfirmOpen(true);
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
          >
            <UserMinusIcon className="size-5 shrink-0" />
            작성자 차단
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setReportOpen(true);
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            <ExclamationTriangleIcon className="size-5 shrink-0" />
            댓글 신고
          </button>
        </div>
      </BottomSheet>

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetId={comment.id}
        targetType="COMMENT"
      />
    </div>
  );
});

RecordingCommentItem.displayName = "RecordingCommentItem";

export default RecordingCommentItem;
