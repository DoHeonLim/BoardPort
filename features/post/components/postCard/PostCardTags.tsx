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
 * 2026.02.26  임도헌   Renamed   PostCardTags -> PostCardTags로 변경 및 다크모드 개선
 * 2026.03.14  임도헌   Modified  태그 이모지(🏷️)를 # prefix로 교체해 렌더링 일관성 확보
 * 2026.03.14  임도헌   Modified  그리드 카드에서도 태그를 압축형 밀도로 노출할 수 있도록 compact/maxVisible 옵션 추가
 */

"use client";

import { cn } from "@/lib/utils";
import type { PostTag } from "@/features/post/types";

interface PostCardTagsProps {
  tags: PostTag[];
  compact?: boolean;
  maxVisible?: number;
}

/**
 * 게시글 태그를 표시
 * 최대 2개까지만 보여주고, 나머지는 "+N" 형태로 축약
 * (카드 내 공간 효율을 위해 제한)
 */
export default function PostCardTags({
  tags,
  compact = false,
  maxVisible = 2,
}: PostCardTagsProps) {
  if (!tags.length) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - visibleTags.length;

  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {visibleTags.map((tag, index) => (
        <span
          key={index}
          className={cn(
            "rounded-md font-medium",
            compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
            "bg-badge text-badge-text border border-transparent dark:border-white/10"
          )}
        >
          #{tag.name}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span
          className={cn(
            "self-center text-muted",
            compact ? "px-1 py-0.5 text-[9px]" : "px-1.5 py-0.5 text-[10px]"
          )}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
