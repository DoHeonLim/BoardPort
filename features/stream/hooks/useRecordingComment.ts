/**
 * File Name : features/stream/hooks/useRecordingComment.ts
 * Description : 스트리밍 녹화본 댓글 CRUD + 무한 스크롤 커서 페이징 훅 (VodAsset 단위)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.05  임도헌   Renamed   useStreamComment → useRecordingComment 이름 변경 및 구조 통일
 * 2025.09.12  임도헌   Modified  캐시 limit 전달, 커서 안전 비교, 에러코드 분기 표준화
 * 2025.09.20  임도헌   Modified  streamId → vodId 전환, actions 호출부 정합성
 * 2026.01.16  임도헌   Moved     hooks -> hooks/stream
 * 2026.01.18  임도헌   Moved     hooks/stream -> features/stream/hooks
 * 2026.01.28  임도헌   Modified  주석 및 로직 설명 보강
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCachedRecordingComments,
  getRecordingComments,
  createRecordingComment as createCommentAPI,
  deleteRecordingComment as deleteCommentAPI,
} from "@/features/stream/actions/comments";
import { toast } from "sonner";
import type { StreamComment } from "@/features/stream/types";

/**
 * 녹화본 댓글 관리 훅
 *
 * [기능]
 * 1. 초기 댓글 로딩(Cached) 및 커서 기반 추가 로딩
 * 2. 댓글 작성 및 삭제 (성공 후 목록 리프레시)
 * 3. 로딩 상태 관리
 *
 * @param {number} vodId - VOD ID
 * @param {number} pageSize - 페이지당 로드 개수
 */
export function useRecordingComment(vodId: number, pageSize = 10) {
  const [comments, setComments] = useState<StreamComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);

  /**
   * 댓글 목록 조회
   */
  const fetchComments = useCallback(
    async (cursor?: number) => {
      try {
        if (cursor == null) {
          return await getCachedRecordingComments(vodId, pageSize);
        }
        return await getRecordingComments(vodId, cursor, pageSize);
      } catch (error) {
        console.error("댓글 불러오기 실패:", error);
        return [];
      }
    },
    [vodId, pageSize]
  );

  /**
   * 추가 데이터 로드 (Load More)
   */
  const loadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage || isLoading) return;
    setIsFetchingNextPage(true);
    try {
      const lastCommentId = comments[comments.length - 1]?.id;
      const newComments = await fetchComments(lastCommentId);
      setComments((prev) => [...prev, ...newComments]);
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
   * 댓글 목록 초기화 (리프레시)
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
   */
  const createComment = useCallback(
    async (formData: FormData): Promise<void> => {
      try {
        const result = await createCommentAPI(formData);
        if (result.success) {
          toast.success("💬 댓글 작성 완료");
          await refreshComments();
        } else {
          switch (result.error) {
            case "NOT_LOGGED_IN":
              toast.error("로그인이 필요합니다.");
              break;
            case "VALIDATION_FAILED":
              toast.error("입력값을 확인해 주세요.");
              break;
            case "CREATE_FAILED":
            default:
              toast.error("댓글 작성에 실패했습니다.");
          }
        }
      } catch (error) {
        console.error("댓글 작성 중 오류:", error);
        toast.error("댓글 작성 중 오류가 발생했습니다.");
      }
    },
    [refreshComments]
  );

  /**
   * 댓글 삭제 핸들러
   */
  const deleteComment = useCallback(
    async (commentId: number): Promise<void> => {
      try {
        const result = await deleteCommentAPI(commentId, vodId);
        if (result.success) {
          toast.success("🗑️ 댓글 삭제 완료");
          await refreshComments();
        } else {
          switch (result.error) {
            case "NOT_LOGGED_IN":
              toast.error("로그인이 필요합니다.");
              break;
            case "FORBIDDEN":
              toast.error("본인 댓글만 삭제할 수 있습니다.");
              break;
            case "NOT_FOUND":
              toast.error("이미 삭제된 댓글입니다.");
              break;
            case "DELETE_FAILED":
            default:
              toast.error("댓글 삭제에 실패했습니다.");
          }
        }
      } catch (error) {
        console.error("댓글 삭제 중 오류:", error);
        toast.error("댓글 삭제 중 오류가 발생했습니다.");
      }
    },
    [refreshComments, vodId]
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
    setComments,
  };
}
