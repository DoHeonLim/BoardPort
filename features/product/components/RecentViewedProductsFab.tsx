/**
 * File Name : features/product/components/RecentViewedProductsFab.tsx
 * Description : 최근 본 상품 플로팅 진입점 및 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.15  임도헌   Created   제품 추가 FAB 위에 최근 본 상품 원형 진입점과 목록 모달 추가
 * 2026.03.16  임도헌   Modified  상세 저장 직후 최근 본 상품 상태가 즉시 반영되도록 갱신 이벤트 구독 추가
 * 2026.03.23  임도헌   Modified  데스크톱 최근 본 상품 모달의 구조 구분선과 셸 외곽선을 border-border-subtle 기준으로 정리
 * 2026.03.25  임도헌   Modified  최근 본 상품 진입점이 메인 FAB보다 과하게 튀지 않도록 그림자와 외곽 톤을 차분하게 polish
 * 2026.03.25  임도헌   Modified  메인 FAB 및 탭바와의 간격이 더 자연스럽게 보이도록 최근 본 상품 진입점을 소폭 상향
 * 2026.04.02  임도헌   Modified  제품 이미지 public variant 처리 유틸 공용화
 * 2026.04.08  임도헌   Modified  최근 본 상품 개별 삭제와 카드 클릭 시 시트/모달 선닫힘 흐름 추가
 * 2026.04.10  임도헌   Modified  products 타이포 정책에 맞춰 FAB 오버레이/카운트 배지의 초소형 라벨 크기를 text-xs로 정리
 * 2026.04.13  임도헌   Modified  FAB 접근성 이름이 보이는 라벨(최근/개수)과 일치하도록 조정
 * 2026.04.13  임도헌   Modified  썸네일을 장식 요소로 처리하고 자식 텍스트 기반 접근성 이름으로 정리
 * 2026.04.20  임도헌   Modified  최근 본 상품 FAB 포커스 강도를 높여 썸네일 위에서도 상태가 더 또렷하게 보이도록 조정
 * 2026.05.29  임도헌   Modified  최근 본 상품 삭제 버튼이 카드 선닫힘 이벤트를 타지 않도록 전파 기준 보정
 * 2026.08.27  임도헌   Modified  데스크톱 포커스 트랩·초기/복귀 포커스를 공용 useModalFocus로 통일
 * 2026.09.01  임도헌   Modified  태블릿·작은 데스크톱 모달의 카드 열 수를 화면 너비별로 조정
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { XMarkIcon, ClockIcon, TrashIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import BottomSheet from "@/components/global/BottomSheet";
import ProductCard from "@/features/product/components/productCard";
import {
  getRecentViewedProducts,
  RECENT_VIEWED_PRODUCTS_UPDATED_EVENT,
  removeRecentViewedProduct,
  type RecentViewedProduct,
} from "@/features/product/utils/recentViewed";
import { toProductImagePublicUrl } from "@/features/product/utils/image";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import { useModalFocus } from "@/hooks/useModalFocus";

/**
 * 최근 본 상품 FAB 및 목록 시트/모달
 *
 * [기능]
 * - 최근 본 상품이 있을 때만 제품 추가 FAB 위에 원형 진입점 노출
 * - 진입점에는 가장 최근 상품 대표 이미지를 썸네일로 표시
 * - 모바일은 Bottom Sheet, 데스크톱은 중앙 카드 모달로 전체 최근 본 상품 목록 제공
 * - 카드 클릭 시 현재 오버레이를 먼저 닫고 제품 상세 흐름으로 이어지도록 정리
 * - 각 카드 우상단 휴지통으로 최근 본 상품 항목을 개별 제거 가능
 */
export default function RecentViewedProductsFab() {
  const [products, setProducts] = useState<RecentViewedProduct[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const desktopDialogRef = useRef<HTMLDivElement>(null);

  const loadProducts = () => {
    setProducts(getRecentViewedProducts());
  };

  useEffect(() => {
    loadProducts();

    const handleFocus = () => loadProducts();
    const handleRecentViewedUpdated = () => loadProducts();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handleFocus);
    window.addEventListener(
      RECENT_VIEWED_PRODUCTS_UPDATED_EVENT,
      handleRecentViewedUpdated
    );

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handleFocus);
      window.removeEventListener(
        RECENT_VIEWED_PRODUCTS_UPDATED_EVENT,
        handleRecentViewedUpdated
      );
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");
    const syncDesktop = () => setIsDesktop(mediaQuery.matches);

    syncDesktop();
    mediaQuery.addEventListener("change", syncDesktop);

    return () => {
      mediaQuery.removeEventListener("change", syncDesktop);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !isDesktop) return;

    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isDesktop, isOpen]);

  useModalFocus({
    open: isOpen,
    enabled: isDesktop,
    containerRef: desktopDialogRef,
    initialFocusRef: desktopDialogRef,
    onClose: () => setIsOpen(false),
  });

  const latestProduct = products[0];
  const latestProductImageUrl = toProductImagePublicUrl(
    latestProduct?.images[0]?.url
  );
  const previewProducts = useMemo(() => products.slice(0, 8), [products]);
  const handleRemoveProduct = (
    event: React.MouseEvent<HTMLButtonElement>,
    productId: number
  ) => {
    event.preventDefault();
    event.stopPropagation();

    removeRecentViewedProduct(productId);
    const next = getRecentViewedProducts();
    setProducts(next);
    if (next.length === 0) setIsOpen(false);
    toast.success("최근 본 상품에서 제거했습니다.");
  };

  /**
   * 최근 본 상품 삭제 버튼의 pointer 이벤트 전파 차단
   *
   * - 모바일 BottomSheet와 카드 클릭 닫힘 흐름으로 이어지지 않도록 분리
   */
  const handleRemovePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
  };

  const handleOpenProduct = () => {
    setIsOpen(false);
  };

  if (!latestProduct) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="최근 본 상품 열기"
        className="focus-ring-strong fixed right-4 z-40 flex size-12 items-center justify-center rounded-full transition-[background-color,color,border-color,box-shadow] motion-safe:transition-transform duration-300 hover:scale-[1.03] hover:shadow-lg active:scale-95 sm:right-8 sm:size-16 bottom-[calc(148px+env(safe-area-inset-bottom))] sm:bottom-[184px]"
      >
        <div
          aria-hidden="true"
          className="relative flex size-full items-center justify-center overflow-hidden rounded-full border border-background/80 bg-surface shadow-md ring-1 ring-black/5 dark:ring-white/10"
        >
          {latestProductImageUrl ? (
            <Image
              src={latestProductImageUrl}
              alt=""
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-surface-dim text-brand dark:text-brand-light">
              <ClockIcon className="size-6 sm:size-7" />
            </div>
          )}

          <div className="absolute inset-x-1 bottom-1 rounded-full bg-black/70 px-1.5 py-0.5 text-center text-xs font-bold text-white backdrop-blur-sm">
            최근
          </div>
        </div>

        {products.length > 1 && (
          <div className="absolute -right-1 -top-1 flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full border-2 border-background bg-brand px-1 text-xs font-bold text-white shadow-sm sm:min-h-[22px] sm:min-w-[22px]">
            {products.length}
          </div>
        )}

        <span className="sr-only"> 열기</span>
      </button>

      {!isDesktop && (
        <BottomSheet
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title="최근 본 상품"
          description="마지막으로 확인한 상품을 빠르게 다시 보기"
          contentClassName="pt-4"
        >
          <div className="grid grid-cols-2 gap-3 pb-2">
            {previewProducts.map((product, index) => (
              <div
                key={product.id}
                className="relative"
                onClick={handleOpenProduct}
              >
                <button
                  type="button"
                  onPointerDown={handleRemovePointerDown}
                  onClick={(event) => handleRemoveProduct(event, product.id)}
                  className="focus-ring-soft absolute right-2 top-2 z-10 inline-flex min-h-[34px] min-w-[34px] items-center justify-center rounded-full border border-background/80 bg-black/65 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/80"
                  aria-label={`${product.title} 최근 본 상품에서 제거`}
                >
                  <TrashIcon className="size-4" />
                </button>
                <ProductCard
                  product={product}
                  viewMode="grid"
                  isPriority={index < 2}
                />
              </div>
            ))}
          </div>
        </BottomSheet>
      )}

      {isOpen && isDesktop && (
        <div className="fixed inset-0 z-[60] hidden items-center justify-center px-6 sm:flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            ref={desktopDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recent-viewed-products-title"
            tabIndex={-1}
            className="relative flex max-h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-2xl outline-none"
          >
            <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
              <div>
                <h2
                  id="recent-viewed-products-title"
                  className="text-lg font-bold text-primary"
                >
                  최근 본 상품
                </h2>
                <p className="mt-1 text-sm text-muted">
                  마지막으로 확인한 상품을 빠르게 다시 보기
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary"
                aria-label="최근 본 상품 모달 닫기"
              >
                <XMarkIcon className="size-6" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {previewProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="relative"
                    onClick={handleOpenProduct}
                  >
                    <button
                      type="button"
                      onPointerDown={handleRemovePointerDown}
                      onClick={(event) =>
                        handleRemoveProduct(event, product.id)
                      }
                      className="focus-ring-soft absolute right-3 top-3 z-10 inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full border border-background/80 bg-black/65 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/80"
                      aria-label={`${product.title} 최근 본 상품에서 제거`}
                    >
                      <TrashIcon className="size-4" />
                    </button>
                    <ProductCard
                      product={product}
                      viewMode="grid"
                      isPriority={index < 4}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
