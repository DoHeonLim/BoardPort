/**
 * File Name : components/post/PostForm
 * Description : 게시글 작성/수정 공통 폼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.04  임도헌   Created   기존 add/page.tsx 흐름 유지하며 공통 폼 리팩토링
 * 2025.11.13  임도헌   Modieifd  h1 삭제
 */

import PostForm from "@/features/post/components/PostForm";
import { createPost } from "@/features/post/lib/createPost";

export default function AddPostPage() {
  return (
    <div className="min-h-screen dark:bg-neutral-900 bg-white">
      <PostForm
        onSubmit={createPost}
        backUrl="/posts"
        submitLabel="게시글 등록"
      />
    </div>
  );
}
