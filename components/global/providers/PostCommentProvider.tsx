/**
 * File Name : components/providers/PostCommentProvider.tsx
 * Description : 댓글 상태 관리 Provider
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.11  임도헌   Created   댓글 상태 관리 Provider 구현
 * 2026.01.16  임도헌   Renamed   CommentProvider -> PostCommentProvider
 * 2026.01.18  임도헌   Moved     components/providers -> components/global/providers
 */
"use client";

import React from "react";
import PostCommentContext from "../../../features/post/components/postComment/PostCommentContext";
import { usePostComment } from "@/features/post/hooks/usePostComment";

interface PostCommentProviderProps {
  postId: number;
  children: React.ReactNode;
}

export default function PostCommentProvider({
  postId,
  children,
}: PostCommentProviderProps) {
  const value = usePostComment(postId);

  return (
    <PostCommentContext.Provider value={value}>
      {children}
    </PostCommentContext.Provider>
  );
}
