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
 * 2026.05.09  임도헌   Modified  보드게임 도감/키워드 알림 액션이 포함된 상품 목록 헤더 구조 반영
 * 2026.06.01  임도헌   Modified  모바일 상품 목록 헤더와 뷰 토글 압축 밀도에 맞춘 스켈레톤 조정
 * 2026.06.21  임도헌   Modified  실제 뷰 토글 버튼 크기(모바일 36px, sm 이상 44px)에 맞춰 로딩 스켈레톤 정렬
 */

import ProductListSkeleton from "@/features/product/components/ProductListSkeleton";
import Skeleton from "@/components/ui/Skeleton";

/**
 * products 라우트 전용 loading UI
 *
 * - 모바일/데스크톱 헤더 골격은 이 파일에서 직접 렌더링해 첫 진입 구조와 빠르게 정합
 * - 본문 카드 영역은 `ProductListSkeleton`을 재사용하되, 툴바 스켈레톤은 여기서 단일 노출
 */
export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 transition-colors">
      <div className="sm:hidden">
        <header className="border-b border-border-subtle bg-background px-3 pt-1.5 pb-1.5 shadow-sm">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 flex-1 rounded-xl" />
            <Skeleton className="size-10 rounded-xl" />
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <Skeleton className="h-9 w-14 rounded-xl" />
            <Skeleton className="h-9 flex-1 rounded-xl" />
            <Skeleton className="size-10 rounded-xl" />
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-28 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-9 rounded-full sm:w-28" />
          </div>
          <div className="flex rounded-xl border border-border-subtle bg-surface-dim/80 p-1 shadow-sm">
            <Skeleton className="size-9 rounded-lg sm:size-11" />
            <Skeleton className="size-9 rounded-lg sm:size-11" />
          </div>
        </div>
        <ProductListSkeleton viewMode="list" showToolbar={false} />
      </div>
    </div>
  );
}
