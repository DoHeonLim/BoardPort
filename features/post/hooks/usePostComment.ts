/**
 * File Name : features/post/hooks/usePostComment.ts
 * Description : 댓글 CRUD + 무한 스크롤 커서 페이징 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.11  임도헌   Created   useComment 통합 훅
 * 2026.01.16  임도헌   Moved     hooks -> hooks/post
 * 2026.01.16  임도헌   Renamed   useComment -> usePostComment
 * 2026.01.18  임도헌   Moved     hooks/post -> features/post/hooks
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { PostComment } from "@/types/post";
import { createComment as createCommentAPI } from "@/features/post/lib/createComment";
import { deleteComment as deleteCommentAPI } from "@/features/post/lib/deleteComment";
import {
  getCachedComments,
  getComments,
} from "@/app/posts/[id]/actions/comments";
import { toast } from "sonner";

export function usePostComment(postId: number, pageSize = 10) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);

  const fetchComments = useCallback(
    async (cursor?: number) => {
      try {
        if (!cursor) {
          return await getCachedComments(postId); // 초기 로드
        }
        return await getComments(postId, cursor, pageSize); // 추가 로드
      } catch (error) {
        console.error("댓글 불러오기 실패:", error);
        return [];
      }
    },
    [postId, pageSize]
  );

  const loadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage || isLoading) return;
    setIsFetchingNextPage(true);

    const lastCommentId = comments[comments.length - 1]?.id;
    const newComments = await fetchComments(lastCommentId);

    setComments((prev) => [...prev, ...newComments]);
    setHasNextPage(newComments.length === pageSize);
    setIsFetchingNextPage(false);
  }, [
    comments,
    fetchComments,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    pageSize,
  ]);

  const refreshComments = useCallback(async () => {
    setIsLoading(true);
    const initial = await fetchComments();
    setComments(initial);
    setHasNextPage(initial.length === pageSize);
    setIsLoading(false);
  }, [fetchComments, pageSize]);

  const createComment = useCallback(
    async (formData: FormData): Promise<void> => {
      try {
        const result = await createCommentAPI(formData);
        if (result.success) {
          toast.success("💬 댓글 작성 완료");
          await refreshComments();
        } else {
          toast.error(result.error ?? "댓글 작성 실패");
        }
      } catch (error) {
        console.error("댓글 작성 중 오류:", error);
      }
    },
    [refreshComments]
  );

  const deleteComment = useCallback(
    async (commentId: number): Promise<void> => {
      try {
        const result = await deleteCommentAPI(commentId, postId);
        if (result.success) {
          toast.success("🗑️ 댓글 삭제 완료");
          await refreshComments();
        } else {
          toast.error(result.error ?? "댓글 삭제 실패");
        }
      } catch (error) {
        console.error("댓글 삭제 중 오류:", error);
      }
    },
    [refreshComments, postId]
  );

  useEffect(() => {
    refreshComments();
  }, [refreshComments]);

  return {
    comments,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    createComment,
    deleteComment,
  };
}
