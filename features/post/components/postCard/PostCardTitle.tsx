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
 * 2026.03.06  임도헌   Modified  모바일 그리드 제목 줄간격 및 최소 높이를 조정해 카드 하단 공백을 완화
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
        "font-semibold text-primary transition-colors group-hover:text-brand dark:group-hover:text-brand-light leading-snug",
        viewMode === "grid"
          ? "text-sm sm:text-base line-clamp-2 min-h-[1.5rem] sm:min-h-[2.5rem]"
          : "text-base sm:text-lg line-clamp-1"
      )}
    >
      {title}
    </h2>
  );
}
