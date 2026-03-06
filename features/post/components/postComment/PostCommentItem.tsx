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
 */
"use client";

import { forwardRef, useState, useRef, useEffect, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  EllipsisHorizontalIcon,
  UserMinusIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { PostComment } from "@/features/post/types";
import { toggleBlockAction } from "@/features/user/actions/block";
import UserAvatar from "@/components/global/UserAvatar";
import TimeAgo from "@/components/ui/TimeAgo";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import CommentDeleteButton from "@/features/post/components/postComment/PostCommentDeleteButton";

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
 * 1. 작성자 정보 및 내용 표시, 등장/삭제 애니메이션 적용
 * 2. 본인 댓글: 삭제 버튼(`CommentDeleteButton`) 노출
 * 3. 타인 댓글: 더보기 메뉴를 통해 '차단하기' 및 '신고하기' 기능 제공
 * 4. 차단 실행 시 목록에서 해당 유저의 모든 콘텐츠를 숨기기 위해 `router.refresh()` 수행
 *
 * [Note: forwardRef 사용 이유]
 * 이 컴포넌트는 상위(PostCommentList)에서 `AnimatePresence` 내부에 렌더링됨
 * AnimatePresence가 자식 요소의 exit 애니메이션을 제어하기 위해 ref를 주입하므로,
 * 이를 내부 `motion.div`로 전달하기 위해 forwardRef가 필수적
 */
const PostCommentItem = forwardRef<HTMLDivElement, CommentItemProps>(
  ({ postId, comment, currentUser }, ref) => {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // UI 상태 관리
    const [menuOpen, setMenuOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const isOwner = comment.user.username === currentUser.username;

    // 외부 클릭 시 메뉴 닫기
    useEffect(() => {
      const onClick = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setMenuOpen(false);
        }
      };
      if (menuOpen) document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }, [menuOpen]);

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
          router.refresh(); // 차단된 유저의 댓글을 목록에서 즉시 필터링하기 위해 리프레시
        } else {
          toast.error(result.error);
        }
      });
    };

    return (
      <motion.div
        ref={ref} // 전달받은 ref를 motion.div에 연결 (AnimatePresence 동작용)
        layout
        initial={{ x: -200, opacity: 0 }} // 멀리서 시작 (Wave Effect)
        animate={{
          x: 0,
          opacity: 1,
          transition: {
            type: "tween",
            ease: [0.25, 1, 0.5, 1], // ease-out cubic bezier
            duration: 0.6,
          },
        }}
        exit={{
          x: 200,
          opacity: 0,
          transition: {
            ease: [0.4, 0, 1, 1], // ease-in cubic bezier
            duration: 0.4,
          },
        }}
        className="flex gap-3 py-3 border-b border-border last:border-none group"
      >
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
                    className="p-1 text-muted hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="댓글 옵션"
                  >
                    <EllipsisHorizontalIcon className="size-5" />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 mt-1 w-40 bg-surface rounded-xl shadow-xl border border-border z-50 overflow-hidden animate-fade-in">
                      <button
                        onClick={() => setBlockConfirmOpen(true)}
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

          <p className="text-sm text-primary leading-relaxed break-words whitespace-pre-wrap">
            {comment.payload}
          </p>
        </div>

        {/* 차단 확인 다이얼로그 */}
        <ConfirmDialog
          open={blockConfirmOpen}
          title="유저 차단"
          description={`${comment.user.username}님을 차단하시겠습니까? 차단하면 이 유저의 모든 게시글과 댓글이 보이지 않게 됩니다.`}
          confirmLabel="차단"
          onConfirm={handleBlockUser}
          onCancel={() => setBlockConfirmOpen(false)}
          loading={isPending}
        />

        {/* 신고 모달 */}
        {reportOpen && (
          <ReportModal
            isOpen={reportOpen}
            onClose={() => setReportOpen(false)}
            targetId={comment.id}
            targetType="COMMENT"
          />
        )}
      </motion.div>
    );
  }
);

PostCommentItem.displayName = "PostCommentItem";
export default PostCommentItem;
