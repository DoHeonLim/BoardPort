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
 * 2026.03.03  임도헌   Modified  Context Provider 래핑 제거 및 Suspense 적용
 * 2026.03.05  임도헌   Modified  주석 최신화
 * ===============================================================================================
 * RecordingComment (녹화본 댓글) 기능을 구성하는 컴포넌트들을 분리해 모아둔 디렉토리
 *
 * - RecordingCommentForm.tsx         : 댓글 작성 폼
 * - RecordingCommentList.tsx         : 댓글 목록 렌더링 및 무한 스크롤
 * - RecordingCommentItem.tsx         : 개별 댓글 아이템
 * - RecordingCommentDeleteButton.tsx : 댓글 삭제 버튼
 * - index.tsx                        : 위 컴포넌트들을 조합한 최종 컨테이너
 * ===============================================================================================
 */
"use client";

import { Suspense } from "react";
import RecordingCommentForm from "@/features/stream/components/recording/recordingComment/RecordingCommentForm";
import RecordingCommentList from "@/features/stream/components/recording/recordingComment/RecordingCommentList";

interface RecordingCommentProps {
  /** 댓글 대상 VodAsset ID */
  vodId: number;
  currentUserId: number;
}

/**
 * 녹화본(VOD) 댓글 섹션 컨테이너 컴포넌트
 *
 * [상태 주입 및 UI 구성 로직]
 * - 상단 댓글 작성 폼(`RecordingCommentForm`) 및 하단 댓글 목록(`RecordingCommentList`) 컴포넌트 배치
 * - React `Suspense`를 활용한 하위 데이터 로딩 상태의 선언적 제어 및 스켈레톤 UI 렌더링 적용
 */
export default function RecordingComment({
  vodId,
  currentUserId,
}: RecordingCommentProps) {
  return (
    <div className="w-full flex flex-col gap-4">
      <RecordingCommentForm vodId={vodId} />

      <Suspense fallback={<CommentSkeleton />}>
        <RecordingCommentList vodId={vodId} currentUserId={currentUserId} />
      </Suspense>
    </div>
  );
}

function CommentSkeleton() {
  return (
    <div className="py-6 flex flex-col gap-6">
      <div className="h-12 w-full bg-surface-dim animate-pulse rounded-xl" />
      <div className="h-12 w-full bg-surface-dim animate-pulse rounded-xl" />
    </div>
  );
}
