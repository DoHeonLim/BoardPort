/**
 * File Name : components/post/PostCard/PostCardHeader
 * Description : 게게시글 상단 카테고리
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.04  임도헌   Created
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 뱃지 스타일 통일
 */
"use client";

import { POST_CATEGORY } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface PostCardHeaderProps {
  category: string;
}

export default function PostCardHeader({ category }: PostCardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-0.5">
      <span
        className={cn(
          "inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[9px] sm:text-[10px] font-bold tracking-tight",
          "bg-brand/10 text-brand dark:bg-brand-light/10 dark:text-brand-light"
        )}
      >
        {POST_CATEGORY[category as keyof typeof POST_CATEGORY] || category}
      </span>
    </div>
  );
}
