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
 */
"use client";

import { useRef } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { AnimatePresence } from "framer-motion";
import { useRecordingCommentContext } from "@/features/stream/components/recording/recordingComment/RecordingCommentContext";
import RecordingCommentItem from "@/features/stream/components/recording/recordingComment/RecordingCommentItem";

/**
 * 댓글 목록 렌더링 컴포넌트
 *
 * - `AnimatePresence`를 통해 댓글 추가/삭제 시 애니메이션을 적용
 * - `useInfiniteScroll`을 사용하여 무한 스크롤 로딩을 처리
 * - 로딩 및 빈 상태에 대한 UI를 제공
 */
export default function RecordingCommentList({
  currentUserId,
}: {
  currentUserId: number;
}) {
  const { comments, isLoading, hasNextPage, loadMore, isFetchingNextPage } =
    useRecordingCommentContext();
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
            comment={comment}
            currentUserId={currentUserId}
          />
        ))}
      </AnimatePresence>

      <div className="py-6 flex justify-center">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="size-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            <span>댓글을 불러오는 중...</span>
          </div>
        ) : isFetchingNextPage ? (
          <span className="size-5 border-2 border-muted/30 border-t-muted rounded-full animate-spin" />
        ) : !hasNextPage && comments.length > 0 ? (
          <div className="text-xs text-muted/50 italic">
            모든 댓글을 확인했습니다
          </div>
        ) : null}

        <div ref={triggerRef} aria-hidden="true" className="h-1" />
      </div>

      {!isLoading && comments.length === 0 && (
        <div className="py-10 text-center text-muted">
          <p className="text-sm">아직 작성된 댓글이 없습니다.</p>
          <p className="text-xs mt-1">첫 번째 댓글을 남겨보세요!</p>
        </div>
      )}
    </div>
  );
}
