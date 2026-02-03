/**
 * File Name : features/post/components/postDetail/PostDetailTitle.tsx
 * Description : 게시글 상세 제목
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.11  임도헌   Created   PostDetail Title 분리
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 (text-primary)
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 */
"use client";

import { cn } from "@/lib/utils";

interface PostDetailTitleProps {
  title: string;
}

/**
 * 게시글 상세 제목을 표시합니다.
 * 긴 제목은 자동으로 줄바꿈됩니다.
 */
export default function PostDetailTitle({ title }: PostDetailTitleProps) {
  return (
    <h1
      className={cn(
        "text-2xl sm:text-3xl font-bold leading-tight break-words",
        "text-primary"
      )}
    >
      {title}
    </h1>
  );
}
