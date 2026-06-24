/**
 * File Name : features/post/components/postsDetail/PostDetailDescription.tsx
 * Description : 게시글 상세 본문 텍스트 렌더러
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
 * 게시글 TEXT 블록 본문 렌더러
 * 줄바꿈과 긴 단어 개행을 유지해 작성 화면의 읽기 흐름을 그대로 보여준다.
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
