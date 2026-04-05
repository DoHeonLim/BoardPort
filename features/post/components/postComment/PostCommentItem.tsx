/**
 * File Name : features/post/components/postComment/PostCommentItem
 * Description : 단일 댓글 항목
 * Author : 임도헌
 *
 * History
 * 2025.07.06  임도헌   Modified
 * 2026.01.13  임도헌   Modified  시맨틱 토큰(border-border) 적용
 * 2026.01.16  임도헌   Renamed   CommentItem -> PostCommentItem
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.27  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.03  임도헌   Modified  postId props에 추가
 * 2026.03.06  임도헌   Modified  댓글 옵션 메뉴 접근성과 hover 대비를 UI/UX 표준에 맞게 보강
 * 2026.03.08  임도헌   Modified  댓글 항목의 강한 슬라이드 애니메이션과 framer-motion 의존성을 제거
 * 2026.03.12  임도헌   Modified  신고 모달 dynamic import 및 차단 확인 다이얼로그 흐름 추가
 * 2026.03.14  임도헌   Modified  모바일에서도 댓글 옵션 버튼이 항상 보이도록 hover 의존을 제거
 * 2026.03.18  임도헌   Modified  차단 성공 후 router.refresh 대신 댓글 쿼리 무효화로 국소 갱신
 * 2026.03.23  임도헌   Modified  구조 구분선 성격에 맞게 댓글 항목/옵션 메뉴 보더를 subtle 기준으로 정리
 * 2026.03.27  임도헌   Modified  모바일 댓글 옵션을 Bottom Sheet로 통일해 상세 상단 액션과 터치 경험을 맞춤
 * 2026.04.03  임도헌   Modified  댓글 작성자 차단 확인 문구를 다른 도메인과 같은 전역 차단 정책 톤으로 정리
 */
"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  EllipsisHorizontalIcon,
  UserMinusIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { PostComment } from "@/features/post/types";
import { toggleBlockAction } from "@/features/user/actions/block";
import BottomSheet from "@/components/global/BottomSheet";
import UserAvatar from "@/components/global/UserAvatar";
import TimeAgo from "@/components/ui/TimeAgo";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import CommentDeleteButton from "@/features/post/components/postComment/PostCommentDeleteButton";
import { useIsMobile } from "@/hooks/useIsMobile";
import { queryKeys } from "@/lib/queryKeys";

const ReportModal = dynamic(
  () => import("@/features/report/components/ReportModal"),
  { ssr: false }
);

interface CommentItemProps {
  postId: number;
  comment: PostComment;
  currentUser: {
    id: number;
    username: string;
  };
}

/**
 * 개별 댓글 컴포넌트
 *
 * [기능]
 * 1. 작성자 정보 및 내용 표시
 * 2. 본인 댓글: 삭제 버튼(`CommentDeleteButton`) 노출
 * 3. 타인 댓글: 더보기 메뉴를 통해 '차단하기' 및 '신고하기' 기능 제공
 * 4. 차단 실행 시 댓글 쿼리만 무효화해 해당 작성자의 댓글을 국소 갱신
 * 5. 신고 모달은 `dynamic import`로 지연 로딩해 초기 번들 부담 완화
 */
export default function PostCommentItem({
  postId,
  comment,
  currentUser,
}: CommentItemProps) {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const commentsQueryKey = queryKeys.posts.comments(postId);

  // UI 상태 관리
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const isOwner = comment.user.username === currentUser.username;
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

  /**
   * 작성자 차단 실행
   */
  const handleBlockUser = () => {
    startTransition(async () => {
      const result = await toggleBlockAction(comment.userId, "block");
      if (result.success) {
        toast.success(`${comment.user.username}님을 차단했습니다.`);
        setBlockConfirmOpen(false);
        setMenuOpen(false);
        // 차단 관계가 반영된 댓글 목록만 다시 읽어 국소 갱신
        queryClient.invalidateQueries({ queryKey: commentsQueryKey });
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="group flex gap-3 border-b border-border-subtle py-3 last:border-none">
      <UserAvatar
        avatar={comment.user.avatar}
        username={comment.user.username}
        showUsername={false}
        size="sm"
        className="mt-0.5 shrink-0" // 아바타 위치 미세 조정
        compact // 패딩 없는 컴팩트 모드 활용
      />

      <div className="flex-1 min-w-0">
        {/* 헤더: 이름 + 시간 + 삭제버튼 (한 줄) */}
        <div className="flex justify-between items-start leading-none">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary">
              {comment.user.username}
            </span>
            <span className="text-xs text-muted">
              <TimeAgo date={comment.created_at.toString()} />
            </span>
          </div>

          {/* 액션 영역 */}
          <div className="flex items-center">
            {isOwner ? (
              <CommentDeleteButton postId={postId} commentId={comment.id} />
            ) : (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-dim hover:text-primary md:opacity-0 md:group-hover:opacity-100"
                  aria-label="댓글 옵션"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
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
                      className="flex w-full items-center gap-2 border-t border-border-subtle px-4 py-2.5 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/5"
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

      {/* 차단 확인 다이얼로그 */}
      <ConfirmDialog
        open={blockConfirmOpen}
        title="유저 차단"
        description={`${comment.user.username}님을 차단하시겠습니까? 차단하면 전역 차단 관계가 생성되고, 서로의 글과 채팅을 볼 수 없으며 팔로우가 취소됩니다.`}
        confirmLabel="차단"
        onConfirm={handleBlockUser}
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

      {/* 신고 모달 */}
      {reportOpen && (
        <ReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          targetId={comment.id}
          targetType="COMMENT"
        />
      )}
    </div>
  );
}
