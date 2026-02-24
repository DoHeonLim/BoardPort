/**
 * File Name : features/post/components/postDetail/PostDetailDescription
 * Description : 게시글 상세 설명
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.11  임도헌   Created   PostDetail Description 분리
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 (text-primary)
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 */
"use client";

import { cn } from "@/lib/utils";

interface PostDetailDescriptionProps {
  description?: string | null;
}

/**
 * 게시글 본문을 표시
 * - 줄바꿈(whitespace-pre-wrap)을 보존
 * - 긴 단어는 줄바꿈(break-words) 처리
 */
export default function PostDetailDescription({
  description,
}: PostDetailDescriptionProps) {
  if (!description) return null;

  return (
    <p
      className={cn(
        "text-base sm:text-lg leading-relaxed whitespace-pre-wrap break-words",
        "text-primary"
      )}
    >
      {description}
    </p>
  );
}
