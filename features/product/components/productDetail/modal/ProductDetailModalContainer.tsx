/**
 * File Name : components/productDetail/modal/ProductDetailModalContainer.tsx
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
 */
"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductDetailContainer from "@/features/product/components/productDetail";
import CloseButton from "@/components/global/CloseButton";
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
 * - 목록 페이지에서 상세로 이동 시, 전체 페이지 전환 대신 모달로 띄워 UX를 향상시킵니다. (Next.js Parallel Routes)
 * - 배경 스크롤 잠금, 포커스 트랩, ESC 닫기 등 모달 필수 기능을 제공합니다.
 * - 닫기 시 `returnTo` 쿼리 파라미터를 사용하여 이전 목록 상태를 유지하며 복귀합니다.
 */
export default function ProductDetailModalContainer(props: ProductDetailProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Body 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // 초기 포커스 이동 (접근성)
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const returnTo = sp.get("returnTo") || "/products";

  const handleOverlayClick = () => {
    // 배경 클릭 시 닫기: router.push(returnTo)로 복귀
    router.push(returnTo);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
      onClick={handleOverlayClick}
      aria-hidden="true"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="제품 상세"
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          "w-full h-full max-w-screen-sm bg-white dark:bg-neutral-900 rounded-lg shadow-xl flex flex-col overflow-hidden outline-none",
          // 모바일에서는 전체 화면, 데스크톱에서는 중앙 모달 형태 유지
          "sm:h-[85vh] sm:rounded-2xl"
        )}
        onClick={(e) => e.stopPropagation()} // 내부 클릭 시 닫힘 방지
      >
        <div className="flex justify-end p-2 bg-surface border-b border-border shrink-0">
          <CloseButton fallbackHref="/products" returnTo={returnTo} />
        </div>

        <div className="flex-1 overflow-y-auto bg-background">
          <ProductDetailContainer {...props} />
        </div>
      </div>
    </div>
  );
}
