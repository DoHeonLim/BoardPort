/**
 * File Name : features/post/components/postCard/PostCardTitle.tsx
 * Description : 게시글 제목
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.04  임도헌   Created
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 Hover 효과 개선
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.27  임도헌   Modified  주석 보강
 */
"use client";

import { cn } from "@/lib/utils";

interface PostCardTitleProps {
  title: string;
  viewMode: "list" | "grid";
}

/**
 * 게시글 제목을 표시합니다.
 * - Grid View: 최대 2줄 표시 (line-clamp-2)
 * - List View: 최대 1줄 표시 (line-clamp-1)
 */
export default function PostCardTitle({ title, viewMode }: PostCardTitleProps) {
  return (
    <h2
      className={cn(
        "font-semibold text-primary transition-colors group-hover:text-brand dark:group-hover:text-brand-light",
        viewMode === "grid"
          ? "text-sm sm:text-base line-clamp-2 leading-tight"
          : "text-base sm:text-lg line-clamp-1"
      )}
    >
      {title}
    </h2>
  );
}
