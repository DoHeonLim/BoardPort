/**
 * File Name : features/product/components/productDetail/index.tsx
 * Description : 제품 상세 메인 컨테이너
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.08  임도헌   Created   제품 상세 컴포넌트
 * 2026.01.10  임도헌   Modified  배경색 및 레이아웃 정리
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 */
"use client";

import { ProductDetailType } from "@/types/product";
import ProductDetailImages from "@/features/product/components/productDetail/ProductDetailImages";
import ProductDetailMeta from "@/features/product/components/productDetail/ProductDetailMeta";
import ProductDetailHeader from "@/features/product/components/productDetail/ProductDetailHeader";
import ProductDetailInfoGrid from "@/features/product/components/productDetail/ProductDetailInfoGrid";
import ProductDetailTags from "@/features/product/components/productDetail/ProductDetailTags";
import ProductDetailActions from "@/features/product/components/productDetail/ProductDetailActions";

interface ProductDetailProps {
  product: ProductDetailType;
  views: number | null;
  isOwner: boolean;
  likeCount: number;
  isLiked: boolean;
}

export default function ProductDetailContainer({
  product,
  views,
  isOwner,
  likeCount,
  isLiked,
}: ProductDetailProps) {
  return (
    // pb-28: 하단 고정 액션바 공간 확보
    <div className="relative min-h-screen bg-background text-primary pb-28 transition-colors">
      <div className="flex flex-col">
        {/* 이미지 영역 (Full width on mobile) */}
        <ProductDetailImages images={product.images} views={views} />

        {/* 판매자 정보 */}
        <ProductDetailMeta
          username={product.user.username}
          avatar={product.user.avatar}
          created_at={product.created_at.toString()}
        />

        <div className="flex flex-col gap-6 p-page-x py-6">
          {/* 헤더 (제목/가격) */}
          <ProductDetailHeader
            title={product.title}
            price={product.price}
            game_type={product.game_type}
          />

          {/* 설명글 */}
          <p className="text-base text-primary whitespace-pre-wrap leading-relaxed">
            {product.description}
          </p>

          {/* 상세 정보 그리드 */}
          <ProductDetailInfoGrid
            category={product.category}
            min_players={product.min_players}
            max_players={product.max_players}
            play_time={product.play_time}
            condition={product.condition}
            completeness={product.completeness}
            has_manual={product.has_manual}
          />

          {/* 태그 */}
          <ProductDetailTags tags={product.search_tags} />
        </div>
        <div className="absolute">
          {/* 하단 고정 액션 바 (Sticky Bottom) */}
          <ProductDetailActions
            productId={product.id}
            isLiked={isLiked}
            likeCount={likeCount}
            isOwner={isOwner}
          />
        </div>
      </div>
    </div>
  );
}
