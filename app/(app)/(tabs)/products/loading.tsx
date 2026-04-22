/**
 * File Name : app/(app)/(tabs)/products/loading.tsx
 * Description : 제품 로딩 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.14  임도헌   Created
 * 2024.10.14  임도헌   Modified  제품 로딩 페이지 추가
 * 2025.06.08  임도헌   Modified  제품 목록 로딩 수정
 * 2026.01.10  임도헌   Modified  로딩 재수정
 * 2026.03.06  임도헌   Modified  실제 제품 헤더/카드 밀도와 동일한 스켈레톤 구조로 정리
 * 2026.03.11  임도헌   Modified  신규 2단 제품 헤더 구조와 디자인 토큰(border-subtle)에 맞춘 스켈레톤으로 재정렬
 * 2026.03.12  임도헌   Modified  제품 로딩 탭 외곽선을 border-border-subtle 기준으로 통일
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/products/loading.tsx 에서 app/(app)/(tabs)/products/loading.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.13  임도헌   Modified  ProductListSkeleton 상단 툴바와 중복되던 상품 수/뷰 토글 스켈레톤을 단일 노출로 정리
 * 2026.04.17  임도헌   Modified  라우트 로딩이 모바일/데스크톱 헤더와 본문 스켈레톤을 어떻게 나누는지 설명 주석 보강
 * 2026.04.20  임도헌   Modified  앱 셸(sm) 기준과 헤더 스켈레톤 분기 기준을 일치시켜 640~767px 구간 mismatch 정리
 */

import ProductListSkeleton from "@/features/product/components/ProductListSkeleton";
import Skeleton from "@/components/ui/Skeleton";

/**
 * products 라우트 전용 loading UI
 *
 * - 모바일/데스크톱 헤더 골격은 이 파일에서 직접 렌더링해 첫 진입 구조를 빠르게 맞춘다
 * - 본문 카드 영역은 `ProductListSkeleton`을 재사용하되, 툴바 스켈레톤은 이미 여기서 그렸으므로 중복 노출하지 않는다
 */
export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 transition-colors">
      <div className="sm:hidden">
        <header className="border-b border-border-subtle bg-background px-3 pt-2 pb-2 shadow-sm">
          <div className="flex items-center gap-2 py-1">
            <Skeleton className="h-10 w-20 rounded-xl" />
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="size-11 rounded-full" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Skeleton className="h-10 w-14 rounded-xl" />
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 w-11 rounded-xl" />
          </div>
        </header>
      </div>

      <header className="sticky top-0 z-30 hidden border-b border-border-subtle bg-background shadow-sm sm:block">
        <div className="mx-auto max-w-5xl px-5 pt-3 pb-3 lg:px-6">
          <div className="flex items-center gap-3 py-1">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-11 flex-1 rounded-2xl" />
            <Skeleton className="size-11 rounded-full" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Skeleton className="h-10 w-20 rounded-xl" />
            <Skeleton className="h-11 flex-1 rounded-2xl" />
            <Skeleton className="h-11 w-20 rounded-xl" />
          </div>
        </div>
      </header>

      <div className="flex-1 px-page-x py-6">
        <div className="flex items-center justify-between mb-4 px-1">
          <Skeleton className="h-5 w-28 rounded-lg" />
          <div className="flex rounded-xl border border-border-subtle bg-surface-dim/80 p-1 shadow-sm">
            <Skeleton className="size-11 rounded-lg" />
            <Skeleton className="size-11 rounded-lg" />
          </div>
        </div>
        <ProductListSkeleton viewMode="list" showToolbar={false} />
      </div>
    </div>
  );
}
