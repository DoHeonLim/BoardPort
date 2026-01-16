/**
 * File Name : components/post/postDetail/PostDetailDescription
 * Description : 게시글 상세 설명
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.11  임도헌   Created   PostDetail Description 분리
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 (text-primary)
 */
"use client";

import { cn } from "@/lib/utils";

interface PostDetailDescriptionProps {
  description?: string | null;
}

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
