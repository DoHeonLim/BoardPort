/**
 * File Name : app/posts/add/page.tsx
 * Description : 게시글 작성 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.04  임도헌   Created   기존 add/page.tsx 흐름 유지하며 공통 폼 리팩토링
 * 2025.11.13  임도헌   Modified  h1 삭제
 * 2026.01.23  임도헌   Modified  submitPost Action을 연결
 * 2026.01.27  임도헌   Modified  주석 보강
 * 2026.03.06  임도헌   Modified  페이지 배경을 시맨틱 배경 토큰(bg-background)으로 통일
 */

import PostForm from "@/features/post/components/PostForm";
import { createPostAction } from "@/features/post/actions/create";

/**
 * 게시글 작성 페이지
 *
 * - `PostForm` 컴포넌트를 사용하여 게시글 작성 폼을 렌더링
 * - `submitPost` 서버 액션을 연결하여 폼 제출을 처리
 */
export default function AddPostPage() {
  return (
    <div className="min-h-screen bg-background">
      <PostForm
        action={createPostAction}
        backUrl="/posts"
        submitLabel="게시글 등록"
      />
    </div>
  );
}
