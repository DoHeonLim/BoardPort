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
 * ===============================================================================================
 * 이 폴더는 PostComment (게시글 댓글) 기능을 구성하는 컴포넌트들을 분리해 모아둔 디렉토리입니다.
 * Context API를 사용하여 댓글 목록, 작성, 삭제 상태를 전역적으로 관리합니다.
 *
 * - PostCommentContext.tsx      : 댓글 데이터 및 액션(작성/삭제/더보기)을 제공하는 Context
 * - PostCommentProvider.tsx     : Context Provider (usePostComment 훅 연결)
 * - PostCommentForm.tsx         : 댓글 작성 폼 (Textarea)
 * - PostCommentList.tsx         : 댓글 목록 렌더링 및 무한 스크롤 트리거
 * - PostCommentItem.tsx         : 개별 댓글 아이템 (애니메이션 포함)
 * - PostCommentDeleteButton.tsx : 댓글 삭제 버튼 (ConfirmDialog 연동)
 * - index.tsx                   : 위 컴포넌트들을 조합한 최종 PostComment 섹션
 * ===============================================================================================
 */
"use client";

import PostCommentForm from "@/features/post/components/postComment/PostCommentForm";
import PostCommentProvider from "@/components/global/providers/PostCommentProvider";
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
 * 댓글 섹션 컨테이너
 *
 * - `PostCommentProvider`로 감싸서 하위 컴포넌트들이 댓글 데이터와 액션에 접근할 수 있게 합니다.
 * - 상단에 작성 폼(`PostCommentForm`), 하단에 댓글 목록(`PostCommentList`)을 배치합니다.
 */
export default function PostComment({ postId, user }: CommentProps) {
  return (
    <PostCommentProvider postId={postId}>
      <div className="flex flex-col">
        <PostCommentForm postId={postId} />
        <PostCommentList currentUser={user} />
      </div>
    </PostCommentProvider>
  );
}
