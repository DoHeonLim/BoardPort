/**
 * File Name : components/stream/recordingComment/RecordingCommentProvider
 * Description : 스트리밍 댓글 상태 관리 Provider (VodAsset 단위)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.05  임도헌   Created   useStreamComment 기반 Provider
 * 2025.09.20  임도헌   Modified  streamId → vodId 전환
 */

"use client";

import React from "react";
import { useRecordingComment } from "@/hooks/stream/useRecordingComment";
import RecordingCommentContext from "../stream/recording/recordingComment/RecordingCommentContext";

interface RecordingCommentProviderProps {
  vodId: number;
  children: React.ReactNode;
}

export default function RecordingCommentProvider({
  vodId,
  children,
}: RecordingCommentProviderProps) {
  const value = useRecordingComment(vodId);

  return (
    <RecordingCommentContext.Provider value={value}>
      {children}
    </RecordingCommentContext.Provider>
  );
}
