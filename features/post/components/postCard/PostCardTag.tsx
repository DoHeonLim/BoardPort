/**
 * File Name : features/post/components/postCard/PostCardTags.tsx
 * Description : 게시글 태그 목록 (최대 2개 + "외 n개")
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.04  임도헌   Created   Tags 분리 및 축약
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.27  임도헌   Modified  주석 보강
 */

"use client";

import { cn } from "@/lib/utils";
import type { PostTag } from "@/features/post/types";

interface PostCardTagsProps {
  tags: PostTag[];
}

/**
 * 게시글 태그를 표시
 * 최대 2개까지만 보여주고, 나머지는 "+N" 형태로 축약
 * (카드 내 공간 효율을 위해 제한)
 */
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
