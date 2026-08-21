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
 * 2026.04.06  임도헌   Modified  detail-edit 저장 후 back 복귀한 상세는 세션 refresh 플래그를 1회 소비해 최신 데이터로 동기화
 * 2026.04.09  임도헌   Modified  숨김 상품은 최근 본 상품에 저장하지 않고 owner 상세에는 숨김 배지를 노출
 * 2026.04.14  임도헌   Modified  본문 컨테이너를 서버 기준으로 재구성하고 클라이언트 부작용/지도 섹션을 분리해 초기 상세 비용을 절감
 * 2026.04.14  임도헌   Modified  서버 컨테이너 책임과 섹션 조합 흐름이 드러나도록 함수 상단 JSDoc 설명을 보강
 * 2026.05.03  임도헌   Modified  상품 상세에 연결된 보드게임 카탈로그 칩 노출
 * 2026.05.06  임도헌   Modified  게시글/방송 상세와 동일한 도감 이동 카드 표시로 통일
 * 2026.06.18  임도헌   Modified  예약/판매완료 거래 상태를 상세 헤더에 전달
 * 2026.08.13  임도헌   Modified  상품 태그 검색 기록에 현재 조회자 ID 전달
 * ===============================================================================================
 * ProductDetail 페이지를 구성하는 UI 요소들을 분리해 모아둔 디렉토리
 * 각 컴포넌트는 제품 상세 정보의 특정 섹션을 담당
 * - ProductDetailHeader.tsx          : 제품 제목, 가격, 게임 타입 표시
 * - ProductDetailImages.tsx          : 제품 이미지 캐러셀
 * - ProductDetailMeta.tsx            : 판매자 프로필(아바타/이름) 및 작성일 표시
 * - ProductDetailInfoGrid.tsx        : 카테고리, 인원, 시간, 상태 등 상세 스펙 그리드
 * - ProductDetailLocationSection.tsx : 거래 장소 요약 및 지연 로딩 지도 섹션
 * - ProductDetailTags.tsx            : 제품 태그 목록
 * - ProductDetailActions.tsx         : 하단 고정 액션바 (좋아요, 채팅/UP 버튼)
 * - ProductDetailClientEffects.tsx   : 최근 본 상품 저장, refresh 플래그 처리 등 클라이언트 부작용
 * - index.tsx                        : 위 컴포넌트들을 조합한 최종 ProductDetail 컨테이너
 * ===============================================================================================
 */

import { ProductDetailType } from "@/features/product/types";
import ProductDetailImages from "@/features/product/components/productDetail/ProductDetailImages";
import ProductDetailMeta from "@/features/product/components/productDetail/ProductDetailMeta";
import ProductDetailHeader from "@/features/product/components/productDetail/ProductDetailHeader";
import ProductDetailInfoGrid from "@/features/product/components/productDetail/ProductDetailInfoGrid";
import ProductDetailTags from "@/features/product/components/productDetail/ProductDetailTags";
import ProductDetailActions from "@/features/product/components/productDetail/ProductDetailActions";
import ProductDetailClientEffects from "@/features/product/components/productDetail/ProductDetailClientEffects";
import ProductDetailLocationSection from "@/features/product/components/productDetail/ProductDetailLocationSection";
import LinkedBoardGameChips from "@/features/boardgame/components/LinkedBoardGameChips";

interface ProductDetailProps {
  product: ProductDetailType;
  views: number | null;
  isOwner: boolean;
  likeCount: number;
  isLiked: boolean;
  viewerId?: number | null;
  isModalContext?: boolean;
}

/**
 * 제품 상세 본문을 조합하는 최상위 서버 컨테이너.
 * 이미지, 메타, 정보 그리드, 위치, 태그, 하단 액션바를 한 흐름으로 엮되
 * 브라우저 저장소 접근이나 refresh 플래그 소비 같은 클라이언트 부작용은
 * 별도 island로 분리해 서버 렌더링 범위와 초기 번들 효율을 함께 유지
 */
export default function ProductDetailContainer({
  product,
  views,
  isOwner,
  likeCount,
  isLiked,
  viewerId = null,
  isModalContext = false,
}: ProductDetailProps) {
  return (
    <div className="relative min-h-full flex flex-col bg-background text-primary transition-colors">
      {/* 최근 본 상품 저장, 편집 후 1회 refresh 같은 브라우저 부작용은 별도 island로 격리 */}
      <ProductDetailClientEffects
        product={product}
        isModalContext={isModalContext}
      />

      <div className="flex-1 pb-4">
        <ProductDetailImages images={product.images} />

        <ProductDetailMeta
          username={product.user.username}
          avatar={product.user.avatar}
          created_at={product.created_at.toString()}
          views={views}
        />

        <div className="flex flex-col gap-6 p-page-x py-6">
          <ProductDetailHeader
            title={product.title}
            price={product.price}
            game_type={product.game_type}
            bumpCount={product.bump_count}
            showHiddenBadge={isOwner && !!product.hidden_at}
            reservationUserId={product.reservation_userId}
            purchaseUserId={product.purchase_userId}
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

          <LinkedBoardGameChips
            items={product.board_games?.map(({ boardGame }) => boardGame) ?? []}
            variant="cards"
          />

          {/* 위치 섹션의 뷰포트 근접 시점 한정 지도 준비 시작 및 초기 비용 억제 */}
          <ProductDetailLocationSection
            latitude={product.latitude ?? null}
            longitude={product.longitude ?? null}
            locationName={product.locationName ?? null}
            region1={product.region1 ?? null}
            region2={product.region2 ?? null}
            region3={product.region3 ?? null}
          />

          <ProductDetailTags
            tags={product.search_tags}
            viewerId={viewerId}
          />
        </div>
      </div>

      <div className="sticky -bottom-px z-40 mt-auto w-full overflow-hidden bg-surface">
        <ProductDetailActions
          productId={product.id}
          isLiked={isLiked}
          likeCount={likeCount}
          isOwner={isOwner}
          viewerId={viewerId}
          bumpCount={product.bump_count}
        />
      </div>
    </div>
  );
}
