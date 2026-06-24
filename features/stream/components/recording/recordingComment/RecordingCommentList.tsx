/**
 * File Name : features/stream/components/recording/recordingComment/RecordingCommentList.tsx
 * Description : 스트리밍 댓글 리스트 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.05  임도헌   Created   녹화본 댓글 리스트 출력
 * 2025.09.10  임도헌   Modified  IntersectionObserver 안정화, rootMargin/threshold 조정, a11y/폴백 추가
 * 2026.01.14  임도헌   Modified  [Rule 5.1] 로딩 인디케이터 및 Empty State 개선
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.03  임도헌   Modified  명령형 로딩 상태(isLoading) 제거 및 useRecordingCommentsQuery 훅으로 교체
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.08  임도헌   Modified  댓글 목록 등장/퇴장 애니메이션 제거
 * 2026.03.21  임도헌   Modified  목록 끝 안내 문구를 제거해 녹화본 댓글 영역 밀도를 단순화
 * 2026.03.22  임도헌   Modified  무한 스크롤 트리거 하단 여백을 줄여 댓글 리스트 끝 간격을 자연스럽게 조정
 * 2026.03.25  임도헌   Modified  댓글 empty state를 상태 전달 중심으로 단순화해 입력 유도 톤을 완화
 * 2026.04.03  임도헌   Modified  댓글 empty state를 게시글 댓글과 같은 2단 문구 리듬으로 맞춤
 */
"use client";

import { useRef } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useRecordingCommentsQuery } from "@/features/stream/hooks/useRecordingCommentsQuery";
import RecordingCommentItem from "@/features/stream/components/recording/recordingComment/RecordingCommentItem";

/**
 * 녹화본(VOD) 댓글 목록 렌더링 컴포넌트
 *
 * [상태 주입 및 페이징 로직]
 * - `useRecordingCommentsQuery` 훅을 통한 서버 상태(캐시) 주입 및 무한 스크롤 페이징 제어
 * - `useInfiniteScroll` 및 `usePageVisibility`를 활용한 사용자 가시성 기반 스크롤 옵저버 연결
 * - 불필요한 등장/퇴장 연출 없이 댓글 항목을 안정적으로 렌더링
 * - 데이터 로딩(`isFetchingNextPage`) 상태 및 빈 배열(Empty State)에 따른 하단 UI 조건부 렌더링 적용
 */
export default function RecordingCommentList({
  vodId,
  currentUserId,
}: {
  vodId: number;
  currentUserId: number;
}) {
  // Suspense 기반 훅 호출 (데이터 존재 보장)
  const { comments, isFetchingNextPage, hasNextPage, loadMore } =
    useRecordingCommentsQuery(vodId);
  const triggerRef = useRef<HTMLDivElement>(null);
  const isVisible = usePageVisibility();

  useInfiniteScroll({
    triggerRef,
    hasMore: hasNextPage,
    isLoading: isFetchingNextPage,
    onLoadMore: loadMore,
    enabled: isVisible,
    rootMargin: "0px 0px 400px 0px",
    threshold: 0.1,
  });

  return (
    <div className="flex flex-col mt-4">
      {comments.map((comment) => (
        <RecordingCommentItem
          key={comment.id}
          vodId={vodId}
          comment={comment}
          currentUserId={currentUserId}
        />
      ))}

      <div className="py-3 flex justify-center">
        {isFetchingNextPage ? (
          <span className="size-5 border-2 border-muted/30 border-t-muted rounded-full animate-spin" />
        ) : null}

        <div ref={triggerRef} aria-hidden="true" className="h-1" />
      </div>

      {comments.length === 0 && (
        <div className="py-8 text-center text-muted">
          <p className="text-sm">아직 작성된 댓글이 없습니다.</p>
          <p className="mt-1 text-xs">첫 번째 댓글을 남겨보세요!</p>
        </div>
      )}
    </div>
  );
}
