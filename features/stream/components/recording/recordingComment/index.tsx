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
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * ===============================================================================================
 * RecordingComment (녹화본 댓글) 기능을 구성하는 컴포넌트들을 분리해 모아둔 디렉토리
 * Context API를 사용하여 댓글 목록, 작성, 삭제 상태를 전역적으로 관리
 * - RecordingCommentContext.tsx      : 댓글 데이터 및 액션을 제공하는 Context
 * - RecordingCommentProvider.tsx     : Context Provider (useRecordingComment 훅 연결)
 * - RecordingCommentForm.tsx         : 댓글 작성 폼
 * - RecordingCommentList.tsx         : 댓글 목록 렌더링 및 무한 스크롤
 * - RecordingCommentItem.tsx         : 개별 댓글 아이템
 * - RecordingCommentDeleteButton.tsx : 댓글 삭제 버튼
 * - index.tsx                        : 위 컴포넌트들을 조합한 최종 컨테이너
 * ===============================================================================================
 */
"use client";

import RecordingCommentProvider from "@/components/global/providers/RecordingCommentProvider";
import RecordingCommentForm from "@/features/stream/components/recording/recordingComment/RecordingCommentForm";
import RecordingCommentList from "@/features/stream/components/recording/recordingComment/RecordingCommentList";

interface RecordingCommentProps {
  /** 댓글 대상 VodAsset ID */
  vodId: number;
  currentUserId: number;
}

/**
 * 녹화본 댓글 섹션 컨테이너
 *
 * - `RecordingCommentProvider`로 감싸서 하위 컴포넌트들이 댓글 데이터와 액션에 접근할 수 있게 함
 * - 작성 폼(`RecordingCommentForm`)과 댓글 목록(`RecordingCommentList`)을 렌더링
 */
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
