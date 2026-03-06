/**
 * File Name : features/product/components/ProductEmptyState.tsx
 * Description : 제품 목록 빈 상태 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   최초 생성
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.27  임도헌   Modified  주석 설명 보강
 * 2026.02.21  임도헌   Modified  currentRange Prop 추가
 * 2026.02.26  임도헌   Modified  다크모드 가시성 개선
 * 2026.03.06  임도헌   Modified  비검색 빈 상태에 첫 상품 등록 CTA 추가
 * 2026.03.06  임도헌   Modified  Empty State 문구 톤과 CTA 배치를 게시글/스트림과 동일한 리듬으로 정리
 * 2026.03.06  임도헌   Modified  Empty/Error 상태 공통 레이아웃 유틸을 적용해 상태 화면 정합성을 높임
 */
"use client";

import Link from "next/link";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import KeywordAlertButton from "@/features/notification/components/KeywordAlertButton";
import type { RegionRange } from "@/generated/prisma/enums";

interface ProductEmptyStateProps {
  hasSearchParams: boolean;
  keyword?: string;
  alertId?: number;
  currentRange: RegionRange;
}

/**
 * 제품 목록이 비어있을 때 표시되는 UI
 *
 * - 검색어(keyword)가 있다면 `KeywordAlertButton`을 제공하여 키워드 등록을 유도함
 * - 유저가 현재 탐색 중인 지역 범위(`currentRange`)를 버튼에 전달하여 의도에 맞는 범위 등록 지원
 *
 * @param hasSearchParams - 검색 필터 적용 여부
 * @param keyword - 현재 검색 중인 키워드
 * @param alertId - 해당 키워드의 알림 등록 ID (등록 상태 확인용)
 * @param currentRange - 현재 탐색 중인 지역 필터 범위
 */
export default function ProductEmptyState({
  hasSearchParams,
  keyword,
  alertId,
  currentRange,
}: ProductEmptyStateProps) {
  return (
    <div className="state-screen">
      <div className="state-card">
        <div className="state-icon-wrap dark:bg-surface dark:border-brand/20">
          <MagnifyingGlassIcon className="size-10 text-muted/50" />
        </div>

        <div>
          <p className="state-title">
            {hasSearchParams
              ? "검색 결과가 없습니다."
              : "등록된 제품이 없습니다."}
          </p>
          <p className="state-description">
            {hasSearchParams
              ? "다른 검색어로 다시 시도해보세요."
              : "첫 번째 상품을 등록해 항구를 채워보세요."}
          </p>
        </div>

        {!hasSearchParams && (
          <div className="state-actions justify-center">
            <Link
              href="/products/add"
              className="btn-primary inline-flex min-h-[44px] items-center justify-center px-6 text-sm shadow-sm"
            >
              첫 상품 등록하기
            </Link>
          </div>
        )}

        {/* 키워드 검색 중이지만 결과가 없을 때 -> 알림 등록 유도 */}
        {keyword && (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface-dim/30 p-4 dark:bg-white/5">
            <p className="text-xs font-medium text-muted">
              이 키워드로 새 상품이 등록되면 알려드릴까요?
            </p>
            <KeywordAlertButton
              keyword={keyword}
              alertId={alertId}
              currentRange={currentRange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
