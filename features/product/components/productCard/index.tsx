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
 * ===============================================================================================
 * 이 폴더는 ProductCard (구 ListProduct) 컴포넌트를 구성하는 UI 요소들을 분리해 모아둔 디렉토리입니다.
 * 각 컴포넌트는 제품 정보를 보여주는 카드에서 특정 부분의 렌더링을 담당합니다:
 *
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
import type { ProductCardProps } from "@/features/product/types";
import { cn } from "@/lib/utils";

/**
 * 제품 카드 (ProductCard)
 *
 * - 목록(List) 및 그리드(Grid) 뷰 모드를 지원합니다.
 * - 썸네일, 헤더(카테고리), 제목, 가격, 태그, 메타 정보를 조합하여 렌더링합니다.
 * - 클릭 시 상세 페이지로 이동하며, `returnTo` 쿼리를 포함하여 목록 복귀를 지원합니다.
 *
 * @param {ProductCardProps} props - 제품 데이터 및 뷰 모드 설정
 */
export default function ProductCard({
  product,
  viewMode,
  isPriority,
}: ProductCardProps) {
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
  } = product;

  const pathname = usePathname();
  const sp = useSearchParams();
  const next = pathname + (sp.size ? `?${sp.toString()}` : "");
  const href = `/products/view/${id}?returnTo=${encodeURIComponent(next)}`;

  const isGrid = viewMode === "grid";

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-md hover:border-brand-light/50 dark:hover:border-brand-light/50",
        isGrid ? "flex-col h-full" : "flex-row h-28 sm:h-36 w-full"
      )}
    >
      {/* 썸네일 영역 */}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden",
          isGrid ? "aspect-[4/3] w-full" : "w-24 sm:w-36 h-full"
        )}
      >
        <ProductCardThumbnail
          imageUrl={images[0]?.url}
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
          "flex flex-1 flex-col justify-between p-3 sm:p-4 min-w-0",
          isGrid ? "gap-2" : "gap-1"
        )}
      >
        <div className="flex flex-col gap-1">
          <ProductCardHeader gameType={game_type} category={category} />

          <div className="flex flex-col">
            <ProductCardTitle title={title} viewMode={viewMode} />
            <ProductCardPrice
              price={price}
              reservation_userId={reservation_userId}
              purchase_userId={purchase_userId}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-auto">
          {/* List View에서만 태그 표시 (공간 확보) */}
          {!isGrid && (
            <div className="hidden sm:block">
              <ProductCardTags tags={search_tags} />
            </div>
          )}

          <ProductCardMeta
            views={views}
            likes={_count.product_likes}
            createdAt={created_at}
          />
        </div>
      </div>
    </Link>
  );
}
