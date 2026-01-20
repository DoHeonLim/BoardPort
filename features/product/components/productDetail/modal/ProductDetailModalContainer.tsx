/**
 * File Name : components/productDetail/modal/ProductDetailModalContainer
 * Description : 제품 상세 페이지 모달 컨테이너
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
import type { ProductDetailType } from "@/types/product";

interface ProductDetailProps {
  product: ProductDetailType;
  views: number | null;
  isOwner: boolean;
  likeCount: number;
  isLiked: boolean;
}

export default function ProductDetailModalContainer(props: ProductDetailProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const dialogRef = useRef<HTMLDivElement>(null);

  // 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // 포커스 트랩(간단 버전: 진입 시 모달에 포커스)
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const returnTo = sp.get("returnTo") || "/products";

  const handleOverlayClick = () => {
    // CloseButton 로직과 동일하게 처리되도록 router.push 대신 CloseButton 사용
    // 여기서는 안전하게 returnTo로 이동
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
        className="w-full h-full max-w-screen-sm bg-white dark:bg-neutral-900 rounded-lg shadow-xl flex flex-col overflow-hidden outline-none"
        onClick={(e) => e.stopPropagation()} // 내부 클릭 시 모달 닫힘 방지
      >
        <div className="flex justify-end p-2">
          <CloseButton fallbackHref="/products" returnTo={returnTo} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <ProductDetailContainer {...props} />
        </div>
      </div>
    </div>
  );
}
