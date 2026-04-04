/**
 * File Name : features/product/components/productDetail/ProductDetailImages.tsx
 * Description : 제품 상세의 이미지 캐러셀 영역
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.08  임도헌   Created   제품 상세 이미지 영역 분리 및 컴포넌트화
 * 2026.01.10  임도헌   Modified  시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.25  임도헌   Modified  주석 및 컴포넌트 구조 설명 보강
 * 2026.03.14  임도헌   Modified  조회수 뱃지를 ProductDetailMeta로 이동, views prop 제거
 */

"use client";

import Carousel from "@/components/ui/Carousel";
import type { ProductImage } from "@/features/product/types";

interface ProductDetailImagesProps {
  images: ProductImage[];
}

/**
 * 제품 이미지 캐러셀 표시
 * 여러 장 이미지를 슬라이드로 넘기고, 클릭 시 공용 확대/축소 모달로 연결
 */
export default function ProductDetailImages({
  images,
}: ProductDetailImagesProps) {
  return (
    <div className="relative w-full aspect-square sm:aspect-[4/3] bg-surface-dim">
      <Carousel images={images} className="w-full h-full" />
    </div>
  );
}
