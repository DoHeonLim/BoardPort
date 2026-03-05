/**
 * File Name : features/post/components/postComment/index.tsx
 * Description : 댓글 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.06  임도헌   Created
 * 2024.11.06  임도헌   Modified  댓글 컴포넌트 추가
 * 2024.11.06  임도헌   Modified  useOptimistic을 사용하여 낙관적 업데이트 추가
 * 2025.07.11  임도헌   Modified  낙관적 업데이트 삭제
 * 2025.07.11  임도헌   Modified  CommentProvider 추가해서 prop Drilling 방지
 * 2026.01.13  임도헌   Modified  [UI] 간격 조정
 * 2026.01.16  임도헌   Renamed   Comment -> PostComment
 * 2026.01.17  임도헌   Renamed   PostComment.tsx -> index.tsx
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.27  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.03  임도헌   Modified  Context Provider 래핑 제거 및 Suspense 적용
 * 2026.03.05  임도헌   Modified  주석 최신화
 * ===============================================================================================
 * PostComment (게시글 댓글) 기능을 구성하는 컴포넌트들을 분리해 모아둔 디렉토리
 *
 * - PostCommentForm.tsx         : 댓글 작성 폼 (Textarea)
 * - PostCommentList.tsx         : 댓글 목록 렌더링 및 무한 스크롤 트리거
 * - PostCommentItem.tsx         : 개별 댓글 아이템 (애니메이션 포함)
 * - PostCommentDeleteButton.tsx : 댓글 삭제 버튼 (ConfirmDialog 연동)
 * - index.tsx                   : 위 컴포넌트들을 조합한 최종 PostComment 섹션
 * ===============================================================================================
 */
"use client";

import { Suspense } from "react";
import PostCommentForm from "@/features/post/components/postComment/PostCommentForm";
import PostCommentList from "@/features/post/components/postComment/PostCommentList";

interface UserLite {
  id: number;
  username: string;
  avatar: string | null;
}

interface CommentProps {
  postId: number;
  user: UserLite;
}

/**
 * 게시글 댓글 섹션 컨테이너
 *
 * [상태 주입 및 UI 구성 로직]
 * - 상단 댓글 작성 폼(`PostCommentForm`) 및 하단 댓글 목록(`PostCommentList`) 컴포넌트 배치
 * - React `Suspense`를 활용한 하위 컴포넌트의 데이터 로딩 상태 선언적 제어 및 스켈레톤 UI 렌더링 적용
 */
export default function PostComment({ postId, user }: CommentProps) {
  return (
    <div className="flex flex-col">
      <PostCommentForm postId={postId} />

      <Suspense fallback={<CommentSkeleton />}>
        <PostCommentList postId={postId} currentUser={user} />
      </Suspense>
    </div>
  );
}

/**
 * 초기 로딩 시 표시할 스켈레톤 UI
 */
function CommentSkeleton() {
  return (
    <div className="py-6 flex flex-col gap-6">
      <div className="h-12 w-full bg-surface-dim animate-pulse rounded-xl" />
      <div className="h-12 w-full bg-surface-dim animate-pulse rounded-xl" />
    </div>
  );
}
