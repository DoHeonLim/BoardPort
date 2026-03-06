/**
 * File Name : features/product/components/productDetail/modal/ProductDetailModalContainer.tsx
 * Description : 제품 상세 모달 컨테이너 (Intercepting Route용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.08  임도헌   Created   모달 스타일을 적용한 제품 상세 컨테이너 래퍼
 * 2025.06.08  임도헌   Modified  어두운 배경과 중앙 정렬 레이아웃 추가
 * 2025.11.13  임도헌   Modified  CloseButton(returnTo) 적용, role="dialog" 등 접근성 보강
 * 2026.01.10  임도헌   Modified  모바일 및 데스크톱 레이아웃 변경
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.02.27  임도헌   Modified  모바일 높이를 h-full로 고정하여 하단 액션바 짤림 현상 해결
 * 2026.03.05  임도헌   Modified  ProductDetailContainer에 isModalContext 전달
 * 2026.03.06  임도헌   Modified  상단 공유/옵션 메뉴 추가 및 포커스 복귀 처리 보강
 * 2026.03.06  임도헌   Modified  상세 상단 액션바 버튼 스타일을 공통 규칙으로 통일
 */
"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ProductDetailContainer from "@/features/product/components/productDetail";
import CloseButton from "@/components/global/CloseButton";
import ProductOptionMenu from "@/features/product/components/productDetail/ProductOptionMenu";
import ProductShareButton from "@/features/product/components/ProductShareButton";
import type { ProductDetailType } from "@/features/product/types";
import { cn } from "@/lib/utils";

interface ProductDetailProps {
  product: ProductDetailType;
  views: number | null;
  isOwner: boolean;
  likeCount: number;
  isLiked: boolean;
}

/**
 * 제품 상세 페이지를 모달 형태로 띄우는 래퍼 컴포넌트
 * - 목록 페이지에서 상세로 이동 시, 전체 페이지 전환 대신 모달로 띄워 UX를 향상 (Next.js Parallel Routes)
 * - 배경 스크롤 잠금, 포커스 트랩, ESC 닫기 등 모달 필수 기능을 제공
 * - 닫기 시 `returnTo` 쿼리 파라미터를 사용하여 이전 목록 상태를 유지하며 복귀
 */
export default function ProductDetailModalContainer(props: ProductDetailProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Body 스크롤 잠금
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      previousFocusRef.current?.focus?.();
    };
  }, []);

  // 초기 포커스 이동 (접근성)
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const returnTo = sp.get("returnTo") || "/products";

  const handleOverlayClick = () => {
    // Intercepting Route 종료는 replace로 슬롯 상태를 안정적으로 정리
    router.replace(returnTo);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="제품 상세"
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          "bg-surface shadow-xl flex flex-col overflow-hidden outline-none text-primary",
          // [Mobile] 부모의 inset-0에 완벽하게 맞추어 짤림 원천 차단
          "w-full h-full rounded-none",
          // [Desktop] 중앙 모달 형태
          "sm:h-auto sm:max-h-[85vh] sm:min-h-[500px] sm:max-w-screen-sm sm:rounded-2xl sm:border sm:border-border"
        )}
        onClick={(e) => e.stopPropagation()} // 내부 클릭 시 닫힘 방지
      >
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-3 py-2 shrink-0">
          <CloseButton fallbackHref="/products" returnTo={returnTo} />
          <div className="flex items-center gap-1">
            <ProductShareButton title={props.product.title} />
            {props.isOwner ? (
              <Link
                href={`/products/view/${props.product.id}/edit`}
                replace
                className="appbar-link-btn"
              >
                수정
              </Link>
            ) : (
              <ProductOptionMenu
                productId={props.product.id}
                sellerId={props.product.userId}
                sellerName={props.product.user.username}
              />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-background">
          <ProductDetailContainer {...props} isModalContext />
        </div>
      </div>
    </div>
  );
}
