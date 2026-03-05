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
 */
"use client";

import { useRef } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { AnimatePresence } from "framer-motion";
import { useRecordingCommentsQuery } from "@/features/stream/hooks/useRecordingCommentsQuery";
import RecordingCommentItem from "@/features/stream/components/recording/recordingComment/RecordingCommentItem";

/**
 * 녹화본(VOD) 댓글 목록 렌더링 컴포넌트
 *
 * [상태 주입 및 페이징 로직]
 * - `useRecordingCommentsQuery` 훅을 통한 서버 상태(캐시) 주입 및 무한 스크롤 페이징 제어
 * - `useInfiniteScroll` 및 `usePageVisibility`를 활용한 사용자 가시성 기반 스크롤 옵저버 연결
 * - `AnimatePresence`를 적용하여 댓글 항목 추가/삭제 시 부드러운 전환(Pop Layout) 애니메이션 제공
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
    rootMargin: "400px 0px 0px 0px",
    threshold: 0.1,
  });

  return (
    <div className="flex flex-col mt-4">
      <AnimatePresence initial={false} mode="popLayout">
        {comments.map((comment) => (
          <RecordingCommentItem
            key={comment.id}
            vodId={vodId}
            comment={comment}
            currentUserId={currentUserId}
          />
        ))}
      </AnimatePresence>

      <div className="py-6 flex justify-center">
        {isFetchingNextPage ? (
          <span className="size-5 border-2 border-muted/30 border-t-muted rounded-full animate-spin" />
        ) : !hasNextPage && comments.length > 0 ? (
          <div className="text-xs text-muted/50 italic">
            모든 댓글을 확인했습니다
          </div>
        ) : null}

        <div ref={triggerRef} aria-hidden="true" className="h-1" />
      </div>

      {comments.length === 0 && (
        <div className="py-10 text-center text-muted">
          <p className="text-sm">아직 작성된 댓글이 없습니다.</p>
          <p className="text-xs mt-1">첫 번째 댓글을 남겨보세요!</p>
        </div>
      )}
    </div>
  );
}
