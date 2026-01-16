/**
 * File Name : components/post/postDetail/PostDetailCarousel
 * Description : 게시글 상세 이미지 캐러셀
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.11  임도헌   Created   PostDetail Carousel 분리
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 (bg-surface-dim)
 * 2026.01.13  임도헌   Modified  LCP 최적화를 위해 motion 애니메이션 제거 (즉시 렌더링)
 */
"use client";

import Carousel from "@/components/ui/Carousel";
import { cn } from "@/lib/utils";

interface PostDetailCarouselProps {
  images: { id: number; url: string }[];
}

export default function PostDetailCarousel({
  images,
}: PostDetailCarouselProps) {
  if (images.length === 0) return null;

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden mt-6 rounded-2xl shadow-sm",
        "bg-surface-dim border border-border"
      )}
    >
      <Carousel images={images} className="w-full h-full" />
    </div>
  );
}
