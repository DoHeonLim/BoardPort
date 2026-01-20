/**
 * File Name : features/stream/components/recording/recordingComment/index.tsx
 * Description : 스트리밍 녹화본 댓글 섹션 Wrapper 컴포넌트 (VodAsset 단위)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.05  임도헌   Created   Provider 포함 전체 댓글 UI 통합 컴포넌트 구성
 * 2025.09.20  임도헌   Modified  VodAsset 전환(streamId → vodId), import 경로 정리
 * 2026.01.14  임도헌   Modified  [UI] 스타일 통일
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.17  임도헌   Renamed   recordingComment.tsx -> index.tsx
 */

"use client";

import RecordingCommentProvider from "@/components/global/providers/RecordingCommentProvider";
import RecordingCommentForm from "@/features/stream/components/recording/recordingComment/RecordingCommentForm";
import RecordingCommentList from "@/features/stream/components/recording/recordingComment/RecordingCommentList";

interface RecordingCommentProps {
  /** 댓글 대상 VodAsset.id */
  vodId: number;
  currentUserId: number;
}

export default function RecordingComment({
  vodId,
  currentUserId,
}: RecordingCommentProps) {
  return (
    <RecordingCommentProvider vodId={vodId}>
      <div className="w-full flex flex-col gap-4">
        <RecordingCommentForm vodId={vodId} />
        <RecordingCommentList currentUserId={currentUserId} />
      </div>
    </RecordingCommentProvider>
  );
}
