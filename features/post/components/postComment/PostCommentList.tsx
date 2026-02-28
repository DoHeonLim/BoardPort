/**
 * File Name : features/post/components/postComment/PostCommentList.tsx
 * Description : 댓글 목록 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.06  임도헌   Created
 * 2024.11.06  임도헌   Modified  댓글 목록 컴포넌트 추가
 * 2024.11.06  임도헌   Modified  useOptimistic기능으로 댓글 삭제 구현
 * 2024.11.12  임도헌   Modified  프로필 이미지 없을 경우의 코드 추가
 * 2024.11.23  임도헌   Modified  시간이 서버에서 미리 렌더링된 HTML과 클라이언트에서 렌더링된 HTML이 일치하지 않는 문제
 *                                때문에 생긴 오류를 수정해서 일치시키게 변경
 * 2024.12.07  임도헌   Modified  프로필 이미지 컴포넌트 분리
 * 2024.12.12  임도헌   Modified  댓글 생성 시간 표시 변경
 * 2024.12.25  임도헌   Modified  댓글 목록 스타일 변경
 * 2025.07.06  임도헌   Modified  낙관적 업데이트된 comments 사용
 * 2025.07.06  임도헌   Modified  AnimatePresence로 삭제 애니메이션 활성화
 * 2025.07.11  임도헌   Modified  낙관적 업데이트와 애니메이션 충돌, server 액션 성공 시 댓글 추가 되게 변경
 * 2025.07.11  임도헌   Modified  무한 스크롤 기반으로 리팩토링
 * 2025.08.26  임도헌   Modified  usePageVisibility + 새 useInfiniteScroll 옵션 추가
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 로딩 인디케이터 및 텍스트 스타일 개선
 * 2026.01.16  임도헌   Renamed   CommentList -> PostCommentList
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.27  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.26  임도헌   Modified  다크모드 개선
 */
"use client";

import { useRef } from "react";
import { usePostCommentContext } from "@/features/post/components/postComment/PostCommentContext";
import PostCommentItem from "@/features/post/components/postComment/PostCommentItem";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { AnimatePresence } from "framer-motion";
import { usePageVisibility } from "@/hooks/usePageVisibility";

/**
 * 댓글 목록 렌더링 컴포넌트
 *
 * [기능]
 * 1. Context에서 댓글 데이터를 받아와 렌더링
 * 2. `useInfiniteScroll`을 사용하여 스크롤 끝에 도달하면 추가 댓글을 로드
 * 3. `AnimatePresence`를 사용하여 댓글 추가/삭제 시 애니메이션을 적용
 * 4. 로딩 상태 및 빈 상태(Empty State) UI를 처리
 */
export default function PostCommentList({
  currentUser,
}: {
  currentUser: { id: number; username: string; avatar: string | null };
}) {
  const isVisible = usePageVisibility();
  const { comments, isLoading, isFetchingNextPage, hasNextPage, loadMore } =
    usePostCommentContext();
  const triggerRef = useRef<HTMLDivElement>(null);

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
    <div className="flex flex-col mt-6">
      <AnimatePresence initial={false} mode="popLayout">
        {comments.map((comment) => (
          <PostCommentItem
            key={comment.id}
            comment={comment}
            currentUser={currentUser}
          />
        ))}
      </AnimatePresence>

      {/* Loading States */}
      <div className="py-6 flex justify-center">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="size-4 border-2 border-brand/30 border-t-brand dark:border-brand-light/30 dark:border-t-brand-light rounded-full animate-spin" />
            <span>댓글을 불러오는 중...</span>
          </div>
        ) : isFetchingNextPage ? (
          <span className="size-4 border-2 border-brand/30 border-t-brand dark:border-brand-light/30 dark:border-t-brand-light rounded-full animate-spin" />
        ) : !hasNextPage && comments.length > 0 ? (
          <div className="text-xs text-muted/50 italic">
            모든 기록을 확인했습니다
          </div>
        ) : null}

        {/* Infinite Scroll Trigger */}
        <div ref={triggerRef} aria-hidden="true" className="h-1" />
      </div>

      {/* Empty State */}
      {!isLoading && comments.length === 0 && (
        <div className="py-10 text-center text-muted">
          <p className="text-sm">아직 작성된 로그가 없습니다.</p>
          <p className="text-xs mt-1">첫 번째 기록을 남겨보세요!</p>
        </div>
      )}
    </div>
  );
}
