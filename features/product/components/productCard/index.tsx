/**
 * File Name : features/product/components/productCard/index.tsx
 * Description : 제품 카드 메인 컴포넌트 (Grid/List View 지원)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.14  임도헌   Created
 * 2024.10.14  임도헌   Modified  제품 컴포넌트 추가
 * 2024.10.17  임도헌   Modified  이미지 object-cover로 변경
 * 2024.11.02  임도헌   Modified  콘솔에 뜨는 Image에러 size 추가
 * 2024.11.11  임도헌   Modified  클라우드 플레어 이미지 variants 추가
 * 2024.12.07  임도헌   Modified  제품 판매 여부 추가
 * 2024.12.11  임도헌   Modified  제품 대표 이미지로 변경
 * 2024.12.11  임도헌   Modified  제품 마우스 오버 시 애니메이션 추가
 * 2024.12.15  임도헌   Modified  제품 카테고리 추가
 * 2024.12.15  임도헌   Modified  제품 조회수 추가
 * 2024.12.16  임도헌   Modified  제품 좋아요 추가
 * 2024.12.16  임도헌   Modified  제품 태그 추가
 * 2024.12.16  임도헌   Modified  제품 게임 타입 추가
 * 2024.12.24  임도헌   Modified  스타일 수정
 * 2025.05.06  임도헌   Modified  그리드, 리스트 뷰 기능 추가
 * 2025.05.23  임도헌   Modified  카테고리 필드명 변경(name->kor_name)
 * 2025.06.07  임도헌   Modified  ListProduct에서 ProductCard로 이름 변경
 * 2025.06.07  임도헌   Modified  제품 카드 UI 컴포넌트 분리 및 모듈화
 * 2026.01.10  임도헌   Modified  [Rule 7.1] Card Contract & 디자인 토큰 적용
 * 2026.01.11  임도헌   Modified  썸네일 width 조정
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.25  임도헌   Modified  주석 및 컴포넌트 구조 설명 보강
 * 2026.02.15  임도헌   Modified  ProductCardMeta에 region 정보 전달
 * 2026.02.26  임도헌   Modified  제품 리스트 카드 찌그러짐 수정
 * 2026.03.06  임도헌   Modified  모바일 그리드 카드를 압축형 정보 밀도로 재정렬하고 위치 정보 1줄을 복구
 * 2026.03.06  임도헌   Modified  모바일 그리드 썸네일/헤더/가격 밀도를 추가 조정해 카드 비율을 최적화
 * 2026.03.06  임도헌   Modified  리스트 뷰에서는 모바일도 태그를 확인할 수 있도록 노출 규칙을 조정
 * 2026.03.16  임도헌   Modified  iPhone SE 폭에서 리스트 카드 메타가 잘리지 않도록 모바일 높이와 하단 간격 보정
 * 2026.03.16  임도헌   Modified  모바일 리스트 카드에서는 태그 노출 수를 더 줄여 메타 가시성을 확보
 * 2026.03.19  임도헌   Modified  제품 카드의 현재 목록 경로도 내부 경로 기준으로 정규화해 raw returnTo 재전파를 방지
 * 2026.03.25  임도헌   Modified  제품 리스트 최종 polish 과정에서 정보 영역 정렬과 가독성을 정리하고 주석 최신화
 * 2026.03.26  임도헌   Modified  찜 목록에서는 liked_at 기준 메타 시점을 노출할 수 있도록 activityAt 전달
 * 2026.03.26  임도헌   Modified  찜한 내역 카드 우상단 빠른 액션을 '찜 해제' pill 버튼으로 정리
 * ===============================================================================================
 * ProductCard (구 ListProduct) 컴포넌트를 구성하는 UI 요소들을 분리해 모아둔 디렉토리
 * 각 컴포넌트는 제품 정보를 보여주는 카드에서 특정 부분의 렌더링을 담당
 * - ProductCardHeader.tsx    : 게임 타입 및 카테고리 경로 표시
 * - ProductCardTitle.tsx     : 제품 제목 표시
 * - ProductCardPrice.tsx     : 가격 및 판매/예약 상태 뱃지
 * - ProductCardMeta.tsx      : 조회수, 좋아요 수, 작성 시간
 * - ProductCardTags.tsx      : 제품 관련 태그 목록
 * - ProductCardThumbnail.tsx : 대표 이미지 및 오버레이 렌더링
 * - index.tsx                : 위 컴포넌트들을 조합한 최종 ProductCard
 * ===============================================================================================
 */

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import ProductCardThumbnail from "@/features/product/components/productCard/ProductCardThumbnail";
import { ProductCardHeader } from "@/features/product/components/productCard/ProductCardHeader";
import { ProductCardTitle } from "@/features/product/components/productCard/ProductCardTitle";
import ProductCardPrice from "@/features/product/components/productCard/ProductCardPrice";
import ProductCardMeta from "@/features/product/components/productCard/ProductCardMeta";
import { ProductCardTags } from "@/features/product/components/productCard/ProductCardTags";
import ProductLikeButton from "@/features/product/components/ProductLikeButton";
import type { ProductCardProps } from "@/features/product/types";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { cn } from "@/lib/utils";

/**
 * 제품 카드 (ProductCard)
 *
 * - 목록(List) 및 그리드(Grid) 뷰 모드를 지원
 * - 썸네일, 헤더(카테고리), 제목, 가격, 태그, 메타 정보를 조합하여 렌더링
 * - 클릭 시 상세 페이지로 이동하며, `returnTo` 쿼리를 포함하여 목록 복귀를 지원
 *
 * @param {ProductCardProps} props - 제품 데이터 및 뷰 모드 설정
 */
export default function ProductCard({
  product,
  viewMode,
  isPriority,
  showQuickUnlike = false,
}: ProductCardProps) {
  const likedAt = "liked_at" in product ? product.liked_at : undefined;
  const {
    title,
    price,
    created_at,
    images,
    id,
    reservation_userId,
    purchase_userId,
    category,
    views,
    game_type,
    _count,
    search_tags,
    bump_count,
    region2,
    region3,
  } = product;

  const pathname = usePathname();
  const sp = useSearchParams();
  // 카드 상세 진입에 다시 실리는 현재 목록 경로도 내부 경로 기준으로 정규화
  const next = sanitizeCallbackUrl(
    pathname + (sp.size ? `?${sp.toString()}` : "")
  );
  const href = `/products/view/${id}?returnTo=${encodeURIComponent(next)}`;

  const isGrid = viewMode === "grid";

  return (
    <div
      className={cn(
        "group relative flex overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition duration-300",
        "hover:-translate-y-0.5 hover:shadow-md hover:border-brand-light/50 dark:hover:border-brand-light/50",
        isGrid ? "flex-col h-full" : "flex-row h-32 sm:h-36 w-full"
      )}
    >
      {showQuickUnlike && (
        <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
          <ProductLikeButton
            productId={id}
            isLiked={true}
            likeCount={_count.product_likes}
            variant="quick-remove"
          />
        </div>
      )}

      <Link
        href={href}
        className={cn("flex min-w-0 flex-1", isGrid ? "flex-col" : "flex-row")}
      >
      {/* 썸네일 영역 */}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-surface-dim",
          isGrid
            ? "aspect-[3/2] w-full border-b border-border sm:aspect-[4/3]"
            : "w-24 sm:w-36 h-full"
        )}
      >
        <ProductCardThumbnail
          imageUrl={images[0]?.url}
          isAnimated={images[0]?.isAnimated}
          viewMode={viewMode}
          isPriority={isPriority}
          reservation_userId={reservation_userId}
          purchase_userId={purchase_userId}
          title={title}
        />
      </div>

      {/* 정보 영역 */}
      <div
        className={cn(
          "flex min-w-0 flex-1 p-2 sm:p-3",
          showQuickUnlike && "pr-14 sm:pr-24",
          isGrid
            ? "flex-col justify-start gap-1.5 sm:gap-2"
            : "flex-col justify-between gap-1"
        )}
      >
        <div className="flex flex-col gap-1">
          <ProductCardHeader
            gameType={game_type}
            category={category}
            viewMode={viewMode}
          />

          <div className="flex flex-col">
            <ProductCardTitle title={title} viewMode={viewMode} />
            <ProductCardPrice
              price={price}
              reservation_userId={reservation_userId}
              purchase_userId={purchase_userId}
              viewMode={viewMode}
            />
          </div>
        </div>

        <div className={cn("flex flex-col", isGrid ? "gap-1.5" : "mt-auto gap-1.5")}>
          {/* List View에서만 태그 표시 (모바일 1개, sm 이상 2개 노출) */}
          {!isGrid && (
            <div className="block">
              <ProductCardTags
                tags={search_tags}
                maxTags={2}
                mobileMaxTags={1}
              />
            </div>
          )}

          <ProductCardMeta
            views={views}
            likes={_count.product_likes}
            createdAt={created_at}
            activityAt={likedAt}
            activityLabel={likedAt ? "찜" : undefined}
            bumpCount={bump_count}
            region2={region2}
            region3={region3}
            viewMode={viewMode}
          />
        </div>
      </div>
      </Link>
    </div>
  );
}
