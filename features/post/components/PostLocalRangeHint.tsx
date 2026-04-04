/**
 * File Name : features/post/components/PostLocalRangeHint.tsx
 * Description : 지역 중심 카테고리 탐색을 돕는 안내 힌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   CREW/FREE 카테고리에서 넓은 범위를 탐색 중일 때 동네 범위 안내 힌트 추가
 */
"use client";

import { MapPinIcon } from "@heroicons/react/24/outline";
import {
  LOCAL_FOCUSED_CATEGORIES,
  POST_CATEGORY,
} from "@/features/post/constants";
import type { RegionRange } from "@/generated/prisma/enums";

interface PostLocalRangeHintProps {
  currentCategory?: string;
  currentRange: RegionRange | "ALL";
}

/**
 * 지역성이 강한 카테고리를 넓은 범위로 탐색할 때
 * 상단 지역 토글 사용을 유도하는 보조 힌트.
 */
export default function PostLocalRangeHint({
  currentCategory,
  currentRange,
}: PostLocalRangeHintProps) {
  const isLocalFocused =
    !!currentCategory && LOCAL_FOCUSED_CATEGORIES.includes(currentCategory);
  const isBroadRange = currentRange === "CITY" || currentRange === "ALL";

  if (!isLocalFocused || !isBroadRange) return null;

  return (
    <div className="mb-4 flex items-start gap-2 rounded-2xl border border-border-subtle bg-surface-dim/70 px-4 py-3 text-sm shadow-sm">
      <MapPinIcon className="mt-0.5 size-4 shrink-0 text-brand" />
      <p className="text-muted">
        <span className="font-semibold text-primary">
          {POST_CATEGORY[currentCategory as keyof typeof POST_CATEGORY]}
        </span>{" "}
        카테고리는 동네 범위에서 더 유용한 글이 많습니다. 상단 지역
        버튼으로 범위를 좁혀보세요.
      </p>
    </div>
  );
}
