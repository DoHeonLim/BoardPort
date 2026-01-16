/**
 * File Name : components/stream/recordingComment/RecordingCommentItem
 * Description : 녹화본 단일 댓글 아이템
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.04  임도헌   Created   댓글 아이템 렌더링 및 삭제 기능 추가
 * 2025.08.05  임도헌   Modified  삭제 로직 props 전달 방식으로 변경
 * 2025.08.05  임도헌   Modified  RecordingCommentDeleteButton 적용
 * 2026.01.14  임도헌   Modified  Compact 레이아웃 및 forwardRef 적용
 */
"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import RecordingCommentDeleteButton from "@/components/stream/recording/recordingComment/RecordingCommentDeleteButton";
import UserAvatar from "@/components/global/UserAvatar";
import TimeAgo from "@/components/ui/TimeAgo";
import { StreamComment } from "@/types/stream";

interface RecordingCommentItemProps {
  comment: StreamComment;
  currentUserId: number;
}

const RecordingCommentItem = forwardRef<
  HTMLDivElement,
  RecordingCommentItemProps
>(({ comment, currentUserId }, ref) => {
  const isOwner = comment.user.id === currentUserId;

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

          {isOwner && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-1">
              <RecordingCommentDeleteButton commentId={comment.id} />
            </div>
          )}
        </div>

        <p className="mt-1 text-sm text-primary leading-relaxed break-words whitespace-pre-wrap">
          {comment.payload}
        </p>
      </div>
    </motion.div>
  );
});

RecordingCommentItem.displayName = "RecordingCommentItem";

export default RecordingCommentItem;
