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
 * 2026.03.25  임도헌   Modified  제품 리스트 정보 영역 정렬과 가독성 정리
 * 2026.03.26  임도헌   Modified  찜 목록에서는 liked_at 기준 메타 시점을 노출할 수 있도록 activityAt 전달
 * 2026.03.26  임도헌   Modified  찜한 내역 카드 우상단 빠른 액션을 '찜 해제' pill 버튼으로 정리
 * 2026.04.20  임도헌   Modified  찜 목록 리스트 카드는 주 링크를 하나로 줄여 카드 포커스와 내부 포커스가 과하게 겹치지 않도록 정리
 * 2026.04.20  임도헌   Modified  카드 셸 포커스는 주 링크에만 반응하도록 범위를 좁혀 빠른 찜 해제 버튼과 동시 선택되지 않게 정리
 * 2026.04.11  임도헌   Modified  리스트 카드 하단 메타가 덜 눌려 보이도록 높이와 세로 간격을 소폭 확장
 * 2026.04.13  임도헌   Modified  현재 목록 경로(returnTo) 계산을 상위 리스트에서 주입받도록 변경해 카드 훅 비용을 축소
 * 2026.04.17  임도헌   Modified  찜 목록 리스트 카드의 빠른 해제 액션을 상단 정보 행으로 이동
 * 2026.04.20  임도헌   Modified  카드 링크 포커스가 묻히지 않도록 카드 컨테이너에 keyboard-only inset 링을 추가
 * 2026.05.03  임도헌   Modified  상품 목록 카드에 연결 보드게임 요약 배지 표시
 * 2026.05.04  임도헌   Modified  보드게임 메타 배치를 뷰포트별로 분리해 위치/제품 태그 가시성 복구
 * 2026.05.04  임도헌   Modified  모바일/그리드 카드에서는 분류 경로를 축약해 상품명과 거래 메타 우선순위 강화
 * 2026.05.04  임도헌   Modified  그리드 카드의 연결 보드게임명/태그와 거래 메타를 각각 한 줄로 압축
 * 2026.05.04  임도헌   Modified  모바일 카드에서는 연결 보드게임명 pill을 생략해 하단 거래 메타 영역 확보
 * 2026.05.15  임도헌   Modified  찜한 내역 리스트 카드의 빠른 해제 버튼/보드게임 배지/활동 시점 정렬 충돌 해소
 * 2026.05.15  임도헌   Modified  리스트 카드 하단 메타 여백을 확보하도록 카드 높이와 세로 패딩 미세 조정
 * 2026.05.18  임도헌   Modified  카드 메타 하트 색상을 현재 유저 좋아요 여부 기준으로 전달
 * 2026.05.20  임도헌   Modified  끌어올린 상품은 등록일 대신 refreshed_at 기준 노출 시점을 표시
 * 2026.06.01  임도헌   Modified  그리드 카드의 태그/메타 묶음을 하단 정렬해 카드별 공백 차이 완화
 * 2026.06.04  임도헌   Modified  데모 상품 밀도 대응을 위해 리스트 카드 높이와 썸네일 정렬 보정
 * ===============================================================================================
 * ProductCard (구 ListProduct) 컴포넌트를 구성하는 UI 요소들을 분리해 모아둔 디렉토리
 * 각 컴포넌트는 제품 정보를 보여주는 카드에서 특정 부분의 렌더링을 담당
 * - ProductCardHeader.tsx    : 게임 타입 및 카테고리 경로 표시
 * - ProductCardTitle.tsx     : 제품 제목 표시
 * - ProductCardPrice.tsx     : 가격 및 판매/예약 상태 뱃지
 * - ProductCardMeta.tsx      : 조회수, 좋아요 수, 위치, 기준 시점
 * - ProductCardTags.tsx      : 제품 관련 태그 목록
 * - ProductCardThumbnail.tsx : 대표 이미지 및 오버레이 렌더링
 * - index.tsx                : 위 컴포넌트들을 조합한 최종 ProductCard
 * ===============================================================================================
 */

import Link from "next/link";
import ProductCardThumbnail from "@/features/product/components/productCard/ProductCardThumbnail";
import { ProductCardHeader } from "@/features/product/components/productCard/ProductCardHeader";
import { ProductCardTitle } from "@/features/product/components/productCard/ProductCardTitle";
import ProductCardPrice from "@/features/product/components/productCard/ProductCardPrice";
import ProductCardMeta from "@/features/product/components/productCard/ProductCardMeta";
import { ProductCardTags } from "@/features/product/components/productCard/ProductCardTags";
import ProductLikeButton from "@/features/product/components/ProductLikeButton";
import ProductCardBoardGameBadge from "@/features/product/components/productCard/ProductCardBoardGameBadge";
import type { ProductCardProps } from "@/features/product/types";
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
  returnTo = "/products",
  showQuickUnlike = false,
}: ProductCardProps) {
  const likedAt = "liked_at" in product ? product.liked_at : undefined;
  const {
    title,
    price,
    created_at,
    refreshed_at,
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
    isLiked,
    board_games,
  } = product;

  const href = `/products/view/${id}?returnTo=${encodeURIComponent(returnTo)}`;
  const exposureAt = bump_count > 0 ? refreshed_at : undefined;

  const isGrid = viewMode === "grid";
  const showInlineQuickUnlike = showQuickUnlike && !isGrid;
  const hasBoardGameBadge = Boolean(board_games?.length);
  const showCornerBoardGameBadge =
    !isGrid && hasBoardGameBadge && !showInlineQuickUnlike;

  // 썸네일은 그리드/리스트 높이 전략이 달라 별도 node로 분리
  const thumbnailNode = (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-surface-dim",
        isGrid
          ? "aspect-[3/2] w-full border-b border-border sm:aspect-[4/3]"
          : "w-24 self-stretch sm:w-36"
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
  );

  // 찜한 내역은 우측 상단 액션 영역만 예약하고, 하단 메타는 카드 끝까지 사용할 수 있게 분리
  const headerPriceNode = (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1",
        showInlineQuickUnlike && "pr-16 sm:pr-24",
        showCornerBoardGameBadge && "sm:pr-[46%]"
      )}
    >
      <ProductCardHeader
        gameType={game_type}
        category={category}
        viewMode={viewMode}
        hideCategoryOnMobile
      />

      <div className="flex flex-col">
        <ProductCardTitle title={title} viewMode={viewMode} />
        <ProductCardPrice
          price={price}
          reservation_userId={reservation_userId}
          purchase_userId={purchase_userId}
          viewMode={viewMode}
        />
        {!isGrid && (
          <ProductCardBoardGameBadge
            items={board_games}
            viewMode={viewMode}
            className="hidden"
          />
        )}
      </div>
    </div>
  );

  // 그리드 카드는 연결 보드게임명과 태그를 한 줄로 압축해 하단 거래 메타 공간 확보
  const boardGameTagsNode = isGrid ? (
    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
      <ProductCardBoardGameBadge
        items={board_games}
        viewMode={viewMode}
        className="hidden max-w-[52%] shrink-0 sm:flex"
      />
      <ProductCardTags
        tags={search_tags}
        maxTags={1}
        mobileMaxTags={1}
        className="min-w-0 flex-1 flex-nowrap overflow-hidden"
      />
    </div>
  ) : showInlineQuickUnlike ? (
    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
      <ProductCardBoardGameBadge
        items={board_games}
        viewMode={viewMode}
        className="max-w-[46%] shrink-0"
      />
      <ProductCardTags
        tags={search_tags}
        maxTags={2}
        mobileMaxTags={1}
        className="min-w-0 flex-1 flex-nowrap overflow-hidden"
      />
    </div>
  ) : (
    <ProductCardTags tags={search_tags} maxTags={2} mobileMaxTags={1} />
  );

  const tagsMetaNode = (
    <div className={cn("mt-auto flex flex-col", isGrid ? "gap-1.5" : "gap-2")}>
      {boardGameTagsNode}

      <ProductCardMeta
        views={views}
        likes={_count.product_likes}
        isLiked={Boolean(isLiked || likedAt)}
        createdAt={created_at}
        activityAt={likedAt ?? exposureAt}
        activityLabel={likedAt ? "찜" : undefined}
        bumpCount={bump_count}
        region2={region2}
        region3={region3}
        viewMode={viewMode}
      />
    </div>
  );

  return (
    <div
      className={cn(
        "group relative flex overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition duration-300",
        "hover:-translate-y-0.5 hover:shadow-md hover:border-brand-light/50 dark:hover:border-brand-light/50",
        "has-[a[data-card-link]:focus-visible]:ring-2 has-[a[data-card-link]:focus-visible]:ring-brand has-[a[data-card-link]:focus-visible]:ring-inset has-[a[data-card-link]:focus-visible]:ring-offset-0 dark:has-[a[data-card-link]:focus-visible]:ring-brand-light",
        isGrid
          ? "h-full flex-col"
          : "w-full flex-row min-h-[9rem] sm:min-h-[10.75rem]"
      )}
    >
      {/* 데스크톱 리스트에서는 연결 보드게임명을 우측 상단 보조 정보로 분리 */}
      {showCornerBoardGameBadge && (
        <ProductCardBoardGameBadge
          items={board_games}
          viewMode={viewMode}
          placement="corner"
          className="pointer-events-none absolute right-3 top-3 z-10 hidden sm:flex"
        />
      )}

      {showQuickUnlike && isGrid && (
        <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
          <ProductLikeButton
            productId={id}
            isLiked={true}
            likeCount={_count.product_likes}
            variant="quick-remove"
          />
        </div>
      )}

      {showInlineQuickUnlike ? (
        <>
          <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
            <ProductLikeButton
              productId={id}
              isLiked={true}
              likeCount={_count.product_likes}
              variant="quick-remove"
            />
          </div>

          <Link
            href={href}
            prefetch={false}
            data-card-link
            className="flex min-w-0 flex-1 flex-row self-stretch"
          >
            {thumbnailNode}

            <div className="flex min-w-0 flex-1 px-2.5 py-2.5 sm:px-3.5 sm:py-3.5">
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
                {headerPriceNode}
                {tagsMetaNode}
              </div>
            </div>
          </Link>
        </>
      ) : (
        <Link
          href={href}
          prefetch={false}
          data-card-link
          className={cn(
            "flex min-w-0 flex-1",
            isGrid ? "flex-col" : "flex-row"
          )}
        >
          {thumbnailNode}

          <div
            className={cn(
              "flex min-w-0 flex-1 px-2.5 py-2.5 sm:px-3.5 sm:py-3.5",
              showQuickUnlike && isGrid && "pr-14 sm:pr-24",
              isGrid
                ? "flex-col justify-between gap-1.5 sm:gap-2"
                : "flex-col justify-between gap-1.5"
            )}
          >
            {headerPriceNode}
            {tagsMetaNode}
          </div>
        </Link>
      )}
    </div>
  );
}
