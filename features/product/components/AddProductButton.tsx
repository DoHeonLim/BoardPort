/**
 * File Name : features/product/components/AddProductButton.tsx
 * Description : 제품 추가 플로팅 버튼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   최초 생성
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.27  임도헌   Modified  주석 설명 보강
 * 2026.02.26  임도헌   Modified  하단 플로팅 추가 버튼(+) 위치 조정
 * 2026.03.09  임도헌   Modified  모바일 리스트 가림을 줄이기 위해 FAB 크기와 하단 여백 미세 조정
 * 2026.03.15  임도헌   Modified  최근 본 상품 원형 진입점을 FAB 위에 함께 배치
 * 2026.04.13  임도헌   Modified  최근 본 상품 FAB를 idle 이후 지연 로딩해 products 초기 평가 비용을 완화
 * 2026.04.17  임도헌   Modified  메인 FAB와 최근 본 상품 진입점의 지연 노출 책임이 주석에서 바로 드러나도록 설명 보강
 * 2026.04.26  임도헌   Modified  다크모드 FAB 색조를 primary CTA 톤과 맞춰 정리
 * 2026.08.24  임도헌   Modified  사용자 노출 거래 명칭을 상품으로 통일
 */
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

const RecentViewedProductsFab = dynamic(
  () => import("@/features/product/components/RecentViewedProductsFab"),
  { ssr: false, loading: () => null }
);

/**
 * 화면 우측 하단에 고정된 제품 추가 FAB
 *
 * - 메인 CTA인 `/products/add` 진입 버튼을 항상 고정 노출
 * - 최근 본 상품 진입점은 idle 이후에만 동적 로딩해 products 초기 평가 비용을 낮춤
 * - 모바일 하단 안전 영역과 탭바 높이를 고려해 리스트 가림을 최소화
 */
export default function AddProductButton() {
  const [showRecentViewed, setShowRecentViewed] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    // 최근 본 상품 FAB의 첫 페인트 이후 여유 시점 노출을 통한 공통 초기 JS 부담 완화
    const revealRecentViewed = () => setShowRecentViewed(true);

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(revealRecentViewed, {
        timeout: 1200,
      });
    } else {
      timeoutId = setTimeout(revealRecentViewed, 700);
    }

    return () => {
      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <>
      {showRecentViewed ? <RecentViewedProductsFab /> : null}

      <Link
        href="/products/add"
        prefetch={false}
        title="새 상품 추가"
        aria-label="상품 추가"
        className={cn(
          "focus-ring-strong fixed z-40 flex items-center justify-center rounded-full transition-[background-color,color,border-color,box-shadow] motion-safe:transition-transform duration-300",
          "bg-brand text-white hover:bg-brand-dark dark:bg-brand dark:text-white dark:hover:bg-brand-dark",
          "shadow-lg hover:shadow-xl hover:scale-105 active:scale-95",
          "size-12 sm:size-16 bottom-[80px] sm:bottom-24 right-4 sm:right-8",
          // 기기의 하단 안전 여백(Safe Area)을 고려하여 bottom 위치를 동적으로 계산
          "bottom-[calc(80px+env(safe-area-inset-bottom))] sm:bottom-24"
        )}
      >
        <PlusIcon className="size-7 sm:size-10" />
      </Link>
    </>
  );
}
