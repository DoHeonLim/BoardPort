/**
 * File Name : components/providers/PostCommentProvider.tsx
 * Description : 게시글 댓글 상태 관리 Provider
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.11  임도헌   Created   댓글 상태 관리 Provider 구현
 * 2026.01.16  임도헌   Renamed   CommentProvider -> PostCommentProvider
 * 2026.01.18  임도헌   Moved     components/providers -> components/global/providers
 * 2026.01.29  임도헌   Modified  주석 정리
 */
"use client";

import React from "react";
import PostCommentContext from "@/features/post/components/postComment/PostCommentContext";
import { usePostComment } from "@/features/post/hooks/usePostComment";

interface PostCommentProviderProps {
  postId: number;
  children: React.ReactNode;
}

/**
 * 게시글 댓글 상태를 하위 컴포넌트에 공급하는 Provider
 * - `usePostComment` 훅을 초기화하고 그 결과를 Context로 전달합니다.
 * - `PostComment` 컴포넌트 내부에서 사용됩니다.
 */
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
