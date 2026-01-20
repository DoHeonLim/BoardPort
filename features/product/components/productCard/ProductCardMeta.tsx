/**
 * File Name : featuresp/roduct/components/productCard/ProductCardMeta.tsx
 * Description : 조회수, 좋아요, 생성일 등 제품 메타 정보 표시 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   제품 메타 정보 분리
 * 2026.01.10  임도헌   Modified  아이콘과 텍스트를 text-muted로 통일
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 */

"use client";

import { EyeIcon, HeartIcon } from "@heroicons/react/24/solid";
import TimeAgo from "@/components/ui/TimeAgo";

interface ProductCardMetaProps {
  views: number;
  likes: number;
  createdAt: Date | string;
}

export default function ProductCardMeta({
  views,
  likes,
  createdAt,
}: ProductCardMetaProps) {
  return (
    <div className="flex items-center text-[10px] sm:text-xs text-muted gap-2">
      <div className="flex items-center gap-0.5">
        <HeartIcon
          className={`size-3 ${likes > 0 ? "text-rose-500" : "text-muted/70"}`}
        />
        <span>{likes}</span>
      </div>

      <div className="flex items-center gap-0.5">
        <EyeIcon className="size-3 text-muted/70" />
        <span>{views}</span>
      </div>

      <span className="text-border dark:text-neutral-700">|</span>

      {/* TimeAgo: whitespace-nowrap 추가로 줄바꿈 방지 */}
      <TimeAgo
        date={createdAt.toString()}
        className="text-muted whitespace-nowrap"
      />
    </div>
  );
}
