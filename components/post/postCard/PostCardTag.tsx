/**
 * File Name : components/post/postCard/PostCardTags
 * Description : 게시글 태그 목록 (최대 2개 + "외 n개")
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.04  임도헌   Created   Tags 분리 및 축약
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 */

"use client";

import { cn } from "@/lib/utils";

interface PostCardTagsProps {
  tags: { name: string }[];
}

export default function PostCardTags({ tags }: PostCardTagsProps) {
  if (!tags.length) return null;

  const visibleTags = tags.slice(0, 2);
  const hiddenCount = tags.length - visibleTags.length;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {visibleTags.map((tag, index) => (
        <span
          key={index}
          className={cn(
            "px-2 py-0.5 text-[10px] font-medium rounded-md",
            "bg-badge text-badge-text border border-transparent dark:border-white/10"
          )}
        >
          🏷️{tag.name}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="px-1.5 py-0.5 text-[10px] text-muted self-center">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
