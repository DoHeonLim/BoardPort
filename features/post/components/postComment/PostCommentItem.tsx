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
 */
"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { PostComment } from "@/features/post/types";
import UserAvatar from "@/components/global/UserAvatar";
import TimeAgo from "@/components/ui/TimeAgo";
import CommentDeleteButton from "@/features/post/components/postComment/PostCommentDeleteButton";

interface CommentItemProps {
  comment: PostComment;
  currentUser: {
    id: number;
    username: string;
  };
}

/**
 * 개별 댓글 컴포넌트
 *
 * - Framer Motion을 사용하여 등장/삭제 애니메이션을 적용합니다.
 * - 작성자 정보(아바타, 이름)와 작성 시간, 댓글 내용을 표시합니다.
 * - 본인이 작성한 댓글일 경우 삭제 버튼을 노출합니다.
 *
 * [Note: forwardRef 사용 이유]
 * 이 컴포넌트는 상위(PostCommentList)에서 `AnimatePresence` 내부에 렌더링됩니다.
 * AnimatePresence가 자식 요소의 exit 애니메이션을 제어하기 위해 ref를 주입하므로,
 * 이를 내부 `motion.div`로 전달하기 위해 forwardRef가 필수적입니다.
 */
const PostCommentItem = forwardRef<HTMLDivElement, CommentItemProps>(
  ({ comment, currentUser }, ref) => {
    const isOwner = comment.user.username === currentUser.username;

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

            {isOwner && (
              <div className="-mt-1 -mr-1">
                <CommentDeleteButton commentId={comment.id} />
              </div>
            )}
          </div>

          {/* 본문 */}
          <p className="mt-1 text-sm text-primary leading-relaxed break-words whitespace-pre-wrap">
            {comment.payload}
          </p>
        </div>
      </motion.div>
    );
  }
);

PostCommentItem.displayName = "PostCommentItem"; // 디버깅을 위한 displayName 설정

export default PostCommentItem;
