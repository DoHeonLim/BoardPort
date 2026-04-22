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
 * 2026.04.14  임도헌   Modified  상세 첫 화면 LCP를 줄이기 위해 대표 이미지 sizes/quality를 상세 전용으로 최적화
 * 2026.04.14  임도헌   Modified  상단 이미지 영역의 역할과 모바일 최적화 의도가 드러나도록 함수 상단 JSDoc 설명을 보강
 */

"use client";

import Carousel from "@/components/ui/Carousel";
import type { ProductImage } from "@/features/product/types";

interface ProductDetailImagesProps {
  images: ProductImage[];
}

/**
 * 제품 상세 최상단의 대표 이미지 영역.
 * 공용 Carousel을 재사용하되 상세 화면의 최대 폭과 LCP 특성을 반영한
 * sizes/quality 값을 함께 전달해 첫 진입 시 과한 원본 다운로드를 줄인다.
 */
export default function ProductDetailImages({
  images,
}: ProductDetailImagesProps) {
  return (
    <div className="relative w-full aspect-square sm:aspect-[4/3] bg-surface-dim">
      <Carousel
        images={images}
        className="w-full h-full"
        // 상세 화면 최대 폭 640px 기준 상한 명시, 과한 원본 선택 감소
        imageSizes="(max-width: 640px) 100vw, 640px"
        imageQuality={75}
      />
    </div>
  );
}
