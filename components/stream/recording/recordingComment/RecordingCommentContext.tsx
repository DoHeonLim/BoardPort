/**
 * File Name : components/stream/recordingComment/RecordingCommentContext
 * Description : 스트리밍 댓글 상태 관리 Context
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.05  임도헌   Created   댓글 Context 정의
 */

"use client";

import { createContext, useContext } from "react";
import { StreamComment } from "@/types/stream";

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
