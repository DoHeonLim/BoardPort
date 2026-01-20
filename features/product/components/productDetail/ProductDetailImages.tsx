/**
 * File Name : features/product/components/productDetail/ProductDetailImages.tsx
 * Description : 제품 상세 이미지 및 조회수 표시 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.08  임도헌   Created   제품 상세 이미지 영역 분리 및 컴포넌트화
 * 2026.01.10  임도헌   Modified  시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 */
"use client";

import Carousel from "@/components/ui/Carousel";
import { EyeIcon } from "@heroicons/react/24/solid";

interface ProductDetailImagesProps {
  images: { url: string; order?: number }[];
  views: number | null;
}

export default function ProductDetailImages({
  images,
  views,
}: ProductDetailImagesProps) {
  return (
    // [Layout] 모바일에서는 가로폭 가득, 높이는 적절히 고정 (aspect-square or fixed height)
    <div className="relative w-full aspect-square sm:aspect-[4/3] bg-surface-dim">
      <Carousel images={images} className="w-full h-full" />

      {/* 조회수 뱃지 (Overlay) */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs font-medium shadow-sm">
        <EyeIcon className="size-3.5 text-white/90" />
        <span>{views?.toLocaleString() ?? 0}</span>
      </div>
    </div>
  );
}
