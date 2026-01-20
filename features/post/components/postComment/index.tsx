/**
 * File Name : features/post/components/postComment/index.tsx
 * Description : 댓글 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.06  임도헌   Created
 * 2024.11.06  임도헌   Modified  댓글 컴포넌트 추가
 * 2024.11.06  임도헌   Modified  useOptimistic을 사용하여 낙관적 업데이트 추가
 * 2025.07.11  임도헌   Modified  낙관적 업데이트 삭제
 * 2025.07.11  임도헌   Modified  CommentProvider 추가해서 prop Drilling 방지
 * 2026.01.13  임도헌   Modified  [UI] 간격 조정
 * 2026.01.16  임도헌   Renamed   Comment -> PostComment
 * 2026.01.17  임도헌   Renamed   PostComment.tsx -> index.tsx
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 */
"use client";

import { User } from "@/generated/prisma/client";
import PostCommentForm from "@/features/post/components/postComment/PostCommentForm";
import PostCommentProvider from "@/components/global/providers/PostCommentProvider";
import PostCommentList from "@/features/post/components/postComment/PostCommentList";

interface CommentProps {
  postId: number;
  user: User;
}

export default function PostComment({ postId, user }: CommentProps) {
  return (
    <PostCommentProvider postId={postId}>
      <div className="flex flex-col">
        <PostCommentForm postId={postId} />
        <PostCommentList currentUser={user} />
      </div>
    </PostCommentProvider>
  );
}
