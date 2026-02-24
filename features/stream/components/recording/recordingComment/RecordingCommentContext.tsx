/**
 * File Name : features/stream/components/recording/recordingComment/RecordingCommentContext.tsx
 * Description : 스트리밍 댓글 상태 관리 Context
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.05  임도헌   Created   댓글 Context 정의
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */
"use client";

import { createContext, useContext } from "react";
import { StreamComment } from "@/features/stream/types";

interface RecordingCommentContextProps {
  comments: StreamComment[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  loadMore: () => Promise<void>;
  createComment: (formData: FormData) => Promise<void>;
  deleteComment: (commentId: number) => Promise<void>;
}

const RecordingCommentContext = createContext<
  RecordingCommentContextProps | undefined
>(undefined);

/**
 * 녹화본 댓글 Context 사용 훅
 * Provider 내부가 아닐 경우 에러를 발생
 */
export function useRecordingCommentContext() {
  const context = useContext(RecordingCommentContext);
  if (!context) {
    throw new Error(
      "useRecordingCommentContext는 Provider 내부에서만 사용해야 합니다."
    );
  }
  return context;
}

export default RecordingCommentContext;
