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
 * 2026.01.25  임도헌   Modified  주석 및 컴포넌트 구조 설명 보강
 * ===============================================================================================
 * ProductDetail 페이지를 구성하는 UI 요소들을 분리해 모아둔 디렉토리
 * 각 컴포넌트는 제품 상세 정보의 특정 섹션을 담당
 * - ProductDetailHeader.tsx   : 제품 제목, 가격, 게임 타입 표시
 * - ProductDetailImages.tsx   : 제품 이미지 캐러셀 및 조회수 뱃지
 * - ProductDetailMeta.tsx     : 판매자 프로필(아바타/이름) 및 작성일 표시
 * - ProductDetailInfoGrid.tsx : 카테고리, 인원, 시간, 상태 등 상세 스펙 그리드
 * - ProductDetailTags.tsx     : 제품 태그 목록
 * - ProductDetailActions.tsx  : 하단 고정 액션바 (좋아요, 채팅/수정 버튼)
 * - index.tsx                 : 위 컴포넌트들을 조합한 최종 ProductDetail 컨테이너
 * ===============================================================================================
 */
"use client";

import { ProductDetailType } from "@/features/product/types";
import ProductDetailImages from "@/features/product/components/productDetail/ProductDetailImages";
import ProductDetailMeta from "@/features/product/components/productDetail/ProductDetailMeta";
import ProductDetailHeader from "@/features/product/components/productDetail/ProductDetailHeader";
import ProductDetailInfoGrid from "@/features/product/components/productDetail/ProductDetailInfoGrid";
import StaticMap from "@/features/map/components/StaticMap";
import ProductDetailTags from "@/features/product/components/productDetail/ProductDetailTags";
import ProductDetailActions from "@/features/product/components/productDetail/ProductDetailActions";

interface ProductDetailProps {
  product: ProductDetailType;
  views: number | null;
  isOwner: boolean;
  likeCount: number;
  isLiked: boolean;
}

/**
 * 제품 상세 페이지 컨테이너
 *
 * [구조]
 * 1. 이미지 캐러셀 (상단)
 * 2. 판매자 정보 및 작성일 (메타)
 * 3. 제품 정보 본문 (제목, 가격, 설명, 상세 스펙, 태그)
 * 4. 하단 고정 액션바 (좋아요, 채팅/수정)
 *
 * @param {ProductDetailProps} props - 제품 상세 데이터 및 사용자 권한 정보
 */
export default function ProductDetailContainer({
  product,
  views,
  isOwner,
  likeCount,
  isLiked,
}: ProductDetailProps) {
  // 주소 문자열 조합
  const regionString = [product.region1, product.region2, product.region3]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="relative min-h-full flex flex-col bg-background text-primary transition-colors">
      {/* 본문 영역 (flex-1로 하단 바를 밀어냄) */}
      <div className="flex-1 pb-4">
        {/* 1. 이미지 영역 */}
        <ProductDetailImages images={product.images} views={views} />

        {/* 2. 판매자 정보 */}
        <ProductDetailMeta
          username={product.user.username}
          avatar={product.user.avatar}
          created_at={product.created_at.toString()}
        />

        {/* 3. 본문 영역 */}
        <div className="flex flex-col gap-6 p-page-x py-6">
          <ProductDetailHeader
            title={product.title}
            price={product.price}
            game_type={product.game_type}
            bumpCount={product.bump_count}
          />

          <p className="text-base text-primary whitespace-pre-wrap leading-relaxed">
            {product.description}
          </p>

          <ProductDetailInfoGrid
            category={product.category}
            min_players={product.min_players}
            max_players={product.max_players}
            play_time={product.play_time}
            condition={product.condition}
            completeness={product.completeness}
            has_manual={product.has_manual}
          />

          {/* 거래 장소 */}
          {product.latitude && product.longitude && product.locationName && (
            <section className="py-2 border-t border-border mt-2 pt-6">
              <h3 className="text-sm font-bold text-primary mb-3">
                직거래 희망 장소
              </h3>
              <StaticMap
                latitude={product.latitude}
                longitude={product.longitude}
                locationName={product.locationName}
                regionString={regionString}
              />
            </section>
          )}

          <ProductDetailTags tags={product.search_tags} />
        </div>
      </div>

      {/* 4. 하단 액션바 (sticky 적용으로 스크롤바와 충돌 없이 완벽 정렬) */}
      <div className="sticky bottom-0 z-40 w-full mt-auto">
        <ProductDetailActions
          productId={product.id}
          isLiked={isLiked}
          likeCount={likeCount}
          isOwner={isOwner}
          bumpCount={product.bump_count}
        />
      </div>
    </div>
  );
}
