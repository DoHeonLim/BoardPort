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
 * 2026.03.05  임도헌   Modified  isModalContext prop 전달 추가
 * 2026.03.23  임도헌   Modified  상세 본문의 거래 장소 섹션 구분선을 구조 구분용 border-border-subtle 기준으로 정리
 * 2026.03.25  임도헌   Modified  하단 sticky 액션바 래퍼에도 배경을 부여해 하단 safe-area 틈 노출을 완화
 * 2026.03.26  임도헌   Modified  하단 sticky 액션바 래퍼의 하단 경계를 보강해 서브픽셀 틈 노출을 방지
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

import { useEffect } from "react";
import { ProductDetailType } from "@/features/product/types";
import ProductDetailImages from "@/features/product/components/productDetail/ProductDetailImages";
import ProductDetailMeta from "@/features/product/components/productDetail/ProductDetailMeta";
import ProductDetailHeader from "@/features/product/components/productDetail/ProductDetailHeader";
import ProductDetailInfoGrid from "@/features/product/components/productDetail/ProductDetailInfoGrid";
import StaticMap from "@/features/map/components/StaticMap";
import ProductDetailTags from "@/features/product/components/productDetail/ProductDetailTags";
import ProductDetailActions from "@/features/product/components/productDetail/ProductDetailActions";
import { saveRecentViewedProduct } from "@/features/product/utils/recentViewed";

interface ProductDetailProps {
  product: ProductDetailType;
  views: number | null;
  isOwner: boolean;
  likeCount: number;
  isLiked: boolean;
  isModalContext?: boolean;
}

/**
 * 제품 상세 페이지 컨테이너
 *
 * [구조]
 * 1. 이미지 캐러셀 (상단)
 * 2. 판매자 정보 및 작성일 (메타)
 * 3. 제품 정보 본문 (제목, 가격, 설명, 상세 스펙, 태그)
 * 4. 하단 고정 액션바 (좋아요, 채팅/수정)
 * 5. 상세 진입 시 최근 본 상품 스냅샷을 로컬 저장소에 기록
 *
 * @param {ProductDetailProps} props - 제품 상세 데이터 및 사용자 권한 정보
 */
export default function ProductDetailContainer({
  product,
  views,
  isOwner,
  likeCount,
  isLiked,
  isModalContext = false,
}: ProductDetailProps) {
  useEffect(() => {
    saveRecentViewedProduct({
      id: product.id,
      title: product.title,
      price: product.price,
      created_at: product.created_at.toString(),
      refreshed_at: product.created_at.toString(),
      reservation_userId: product.reservation_userId,
      purchase_userId: product.purchase_userId,
      views: product.views,
      bump_count: product.bump_count,
      game_type: product.game_type,
      region1: product.region1 ?? null,
      region2: product.region2 ?? null,
      region3: product.region3 ?? null,
      images: product.images,
      category: product.category,
      _count: product._count,
      search_tags: product.search_tags,
    });
  }, [product]);

  // 주소 문자열 조합
  const regionString = [product.region1, product.region2, product.region3]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="relative min-h-full flex flex-col bg-background text-primary transition-colors">
      {/* 본문 영역 (flex-1로 하단 바를 밀어냄) */}
      <div className="flex-1 pb-4">
        {/* 1. 이미지 영역 */}
        <ProductDetailImages images={product.images} />

        {/* 2. 판매자 정보 */}
        <ProductDetailMeta
          username={product.user.username}
          avatar={product.user.avatar}
          created_at={product.created_at.toString()}
          views={views}
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
            <section className="mt-2 border-t border-border-subtle py-2 pt-6">
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
      <div className="sticky -bottom-px z-40 mt-auto w-full overflow-hidden bg-surface">
        <ProductDetailActions
          productId={product.id}
          isLiked={isLiked}
          likeCount={likeCount}
          isOwner={isOwner}
          isModalContext={isModalContext}
          bumpCount={product.bump_count}
        />
      </div>
    </div>
  );
}
