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
 * 2026.03.03  임도헌   Modified  명령형 로딩 상태(isLoading) 제거 및 usePostCommentsQuery 훅으로 교체
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.08  임도헌   Modified  댓글 목록의 기본 항목 애니메이션 의존성을 제거해 읽기 중심 화면으로 정리
 * 2026.03.12  임도헌   Modified  usePageVisibility 기반 옵저버 활성화 조건 추가
 * 2026.03.22  임도헌   Modified  무한 스크롤 트리거 하단 여백을 줄여 댓글 리스트 끝 간격을 자연스럽게 조정
 * 2026.03.27  임도헌   Modified  댓글 목록 종료 문구를 제거해 읽기 흐름을 단순화
 * 2026.04.03  임도헌   Modified  댓글 empty state 문구를 실제 콘텐츠 의미에 맞게 정리
 */
"use client";

import { useRef } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { usePostCommentsQuery } from "@/features/post/hooks/usePostCommentsQuery";
import PostCommentItem from "@/features/post/components/postComment/PostCommentItem";

/**
 * 댓글 목록 렌더링 컴포넌트
 *
 * [상태 주입 및 페이징 로직]
 * - `usePostCommentsQuery` 훅을 통한 서버 상태(캐시) 주입 및 페이징 제어
 * - `useInfiniteScroll` 및 `usePageVisibility`를 활용한 사용자 가시성 기반 무한 스크롤 옵저버 연결
 * - 데이터 로딩(`isFetchingNextPage`) 상태 및 빈 배열(Empty State)에 따른 조건부 UI 렌더링
 */
export default function PostCommentList({
  postId,
  currentUser,
}: {
  postId: number;
  currentUser: { id: number; username: string; avatar: string | null };
}) {
  const isVisible = usePageVisibility();
  const triggerRef = useRef<HTMLDivElement>(null);

  const { comments, isFetchingNextPage, hasNextPage, loadMore } =
    usePostCommentsQuery(postId);

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
    <div className="flex flex-col mt-6">
      {comments.map((comment) => (
        <PostCommentItem
          key={comment.id}
          postId={postId}
          comment={comment}
          currentUser={currentUser}
        />
      ))}

      {/* 로딩 상태 */}
      <div className="py-3 flex justify-center">
        {isFetchingNextPage ? (
          <span className="size-4 border-2 border-brand/30 border-t-brand dark:border-brand-light/30 dark:border-t-brand-light rounded-full animate-spin" />
        ) : null}

        <div ref={triggerRef} aria-hidden="true" className="h-1" />
      </div>

      {/* 빈 상태 */}
      {comments.length === 0 && (
        <div className="py-10 text-center text-muted">
          <p className="text-sm">아직 작성된 댓글이 없습니다.</p>
          <p className="text-xs mt-1">첫 번째 댓글을 남겨보세요!</p>
        </div>
      )}
    </div>
  );
}
