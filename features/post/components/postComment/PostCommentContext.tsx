/**
 * File Name : features/post/components/postComment/PostCommentContext.tsx
 * Description : 댓글 상태 관리 Context
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.11  임도헌   Created   댓글 상태 Context 및 Provider 구현
 * 2026.01.16  임도헌   Renamed   CommentContext -> PostCommentContext
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 */
"use client";

import { createContext, useContext } from "react";
import { PostComment } from "@/types/post";

interface PostCommentContextProps {
  comments: PostComment[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  loadMore: () => Promise<void>;
  createComment: (formData: FormData) => Promise<void>;
  deleteComment: (commentId: number) => Promise<void>;
}

const PostCommentContext = createContext<PostCommentContextProps | undefined>(
  undefined
);

export function usePostCommentContext() {
  const context = useContext(PostCommentContext);
  if (!context) {
    throw new Error("useComment는 CommentProvider 내부에서만 사용해야 합니다.");
  }
  return context;
}

export default PostCommentContext;
