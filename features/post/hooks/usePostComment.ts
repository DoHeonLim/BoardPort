/**
 * File Name : features/post/hooks/usePostComment.ts
 * Description : 게시글 댓글 CRUD 및 상태 관리 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.11  임도헌   Created   useComment 통합 훅
 * 2026.01.16  임도헌   Moved     hooks -> hooks/post
 * 2026.01.16  임도헌   Renamed   useComment -> usePostComment
 * 2026.01.18  임도헌   Moved     hooks/post -> features/post/hooks
 * 2026.01.22  임도헌   Modified  Action Import 경로 수정
 * 2026.01.27  임도헌   Modified  주석 및 로직 설명 보강
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  getCachedComments,
  getComments,
  createCommentAction,
  deleteCommentAction,
} from "@/features/post/actions/comments";
import type { PostComment } from "@/features/post/types";

/**
 * 댓글 관리 훅
 *
 * [기능]
 * 1. 초기 댓글 로딩 (Cached) 및 추가 로딩 (Cursor-based Infinite Scroll)
 * 2. 댓글 작성 및 삭제 (Optimistic UI 대신 완료 후 리프레시 방식 사용)
 * 3. 로딩 상태 관리 (isLoading, isFetchingNextPage)
 *
 * @param {number} postId - 게시글 ID
 * @param {number} pageSize - 페이지당 댓글 수 (Default: 10)
 */
export function usePostComment(postId: number, pageSize = 10) {
  // --- State ---
  const [comments, setComments] = useState<PostComment[]>([]);
  const [isLoading, setIsLoading] = useState(true); // 초기 로딩
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false); // 추가 로딩
  const [hasNextPage, setHasNextPage] = useState(true);

  // --- Methods ---

  /**
   * 댓글 목록 조회
   * - cursor가 없으면 초기 페이지(Cached) 조회
   * - cursor가 있으면 다음 페이지(DB) 조회
   */
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

  /**
   * 추가 댓글 로드 (Load More)
   * - 스크롤이 바닥에 닿았을 때 호출됨
   * - 마지막 댓글의 ID를 커서로 사용
   */
  const loadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage || isLoading) return;
    setIsFetchingNextPage(true);

    try {
      const lastCommentId = comments[comments.length - 1]?.id;
      const newComments = await fetchComments(lastCommentId);

      setComments((prev) => [...prev, ...newComments]);
      // 받아온 개수가 pageSize보다 작으면 더 이상 데이터가 없는 것으로 간주
      setHasNextPage(newComments.length === pageSize);
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [
    comments,
    fetchComments,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    pageSize,
  ]);

  /**
   * 댓글 목록 새로고침 (초기화)
   * - 댓글 작성/삭제 후 목록을 최신 상태로 갱신할 때 사용
   */
  const refreshComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const initial = await fetchComments();
      setComments(initial);
      setHasNextPage(initial.length === pageSize);
    } finally {
      setIsLoading(false);
    }
  }, [fetchComments, pageSize]);

  /**
   * 댓글 작성 핸들러
   * - Server Action 호출 후 성공 시 목록 새로고침
   */
  const createComment = useCallback(
    async (formData: FormData): Promise<void> => {
      try {
        const result = await createCommentAction(formData);
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

  /**
   * 댓글 삭제 핸들러
   * - Server Action 호출 후 성공 시 목록 새로고침
   */
  const deleteComment = useCallback(
    async (commentId: number): Promise<void> => {
      try {
        const result = await deleteCommentAction(commentId, postId);
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

  // 초기 마운트 시 댓글 로드
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
