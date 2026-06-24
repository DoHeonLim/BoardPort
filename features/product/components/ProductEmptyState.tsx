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
 * 2026.03.14  임도헌   Modified  현재 범위(GU)가 너무 좁을 때 "범위를 시/전국으로 넓혀보기" CTA 추가
 * 2026.03.23  임도헌   Modified  키워드 알림 유도 점선 카드 외곽선을 구조 구분용 border-border-subtle 기준으로 정리
 * 2026.03.25  임도헌   Modified  검색 결과 없음 상태에서 키워드 알림 카드를 메인 empty state보다 더 보조적으로 보이게 polish
 * 2026.03.28  임도헌   Modified  제품 검색 결과 없음 상태에서 검색어를 제목 대신 보조 문구로 다시 노출해 게시글과 피드백 문법을 통일
 * 2026.04.28  임도헌   Modified  상품 검색 결과 없음 상태에서 보드게임 도감 탐색 진입점 추가
 * 2026.06.15  임도헌   Modified  상세조건 0건 상태를 순수 검색 0건과 구분해 안내
 * 2026.06.16  임도헌   Modified  키워드가 있는 조건 0건 상태에서도 키워드 알림 CTA를 유지
 */
"use client";

import Link from "next/link";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import KeywordAlertButton from "@/features/notification/components/KeywordAlertButton";
import type { RegionRange } from "@/generated/prisma/enums";

interface ProductEmptyStateProps {
  hasSearchParams: boolean;
  hasRefinementParams?: boolean;
  keyword?: string;
  alertId?: number;
  currentRange: RegionRange;
}

/**
 * 제품 목록이 비어있을 때 표시되는 UI
 *
 * - 키워드 검색 결과가 없다면 상세 조건 유무와 관계없이 `KeywordAlertButton`을 제공하여 키워드 등록 유도
 * - 검색 결과가 없을 때 같은 검색어로 보드게임 도감을 탐색할 수 있는 보조 동선 제공
 * - 유저가 현재 탐색 중인 지역 범위(`currentRange`)를 버튼에 전달하여 의도에 맞는 범위 등록 지원
 *
 * @param hasSearchParams - 검색 필터 적용 여부
 * @param hasRefinementParams - 키워드를 제외한 상세 조건 적용 여부
 * @param keyword - 현재 검색 중인 키워드
 * @param alertId - 해당 키워드의 알림 등록 ID (등록 상태 확인용)
 * @param currentRange - 현재 탐색 중인 지역 필터 범위
 */
export default function ProductEmptyState({
  hasSearchParams,
  hasRefinementParams = false,
  keyword,
  alertId,
  currentRange,
}: ProductEmptyStateProps) {
  // 범위가 동/구로 좁을 때 안내가 필요한지 판별
  const isNarrowRange = currentRange === "DONG" || currentRange === "GU";
  const hasActiveRefinements = hasSearchParams && hasRefinementParams;
  const keywordHint =
    hasSearchParams && keyword
      ? hasRefinementParams
        ? `'${keyword}' 검색 결과 중 현재 조건에 맞는 상품을 찾지 못했어요.`
        : `'${keyword}'에 대한 결과를 찾지 못했어요.`
      : null;
  const resetRefinementHref = keyword
    ? `/products?keyword=${encodeURIComponent(keyword)}`
    : "/products";
  const title = hasSearchParams
    ? hasActiveRefinements
      ? "조건에 맞는 상품이 없습니다."
      : "검색 결과가 없습니다."
    : "등록된 제품이 없습니다.";
  const description = hasSearchParams
    ? hasActiveRefinements
      ? keyword
        ? "검색어는 유지하고 분류나 상세 필터를 조금 넓혀보세요."
        : "분류나 상세 필터를 조금 넓혀보세요."
      : isNarrowRange
        ? "다른 검색어로 다시 시도하거나, 동네 범위를 넓혀보세요."
        : "다른 검색어로 다시 시도해보세요."
    : "첫 번째 상품을 등록해 항구를 채워보세요.";

  return (
    <div className="state-screen">
      <div className="state-card">
        <div className="state-icon-wrap dark:bg-surface dark:border-brand/20">
          <MagnifyingGlassIcon className="size-10 text-muted/50" />
        </div>

        <div>
          <p className="state-title">{title}</p>
          <p className="state-description">{description}</p>
          {keywordHint && (
            <p className="mt-2 break-all text-xs font-medium leading-5 text-muted/90 line-clamp-2 sm:line-clamp-3">
              {keywordHint}
            </p>
          )}
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

        {hasActiveRefinements && (
          <div className="state-actions justify-center">
            <Link
              href={resetRefinementHref}
              className="btn-secondary inline-flex min-h-[44px] items-center justify-center px-6 text-sm"
            >
              {keyword ? "필터 풀고 보기" : "조건 풀고 보기"}
            </Link>
          </div>
        )}

        {/* 키워드가 있는 0건 상태에서는 상세 조건 유무와 관계없이 알림 등록 유도 */}
        {keyword && (
          <div className="mt-7 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-subtle bg-surface-dim/20 p-4 dark:bg-white/5">
            <p className="text-xs font-medium text-muted/90">
              이 키워드로 새 상품이 등록되면 알려드릴까요?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <KeywordAlertButton
                keyword={keyword}
                alertId={alertId}
                currentRange={currentRange}
              />
              <Link
                href={`/boardgames?q=${encodeURIComponent(keyword)}`}
                className="focus-ring-soft inline-flex min-h-9 items-center rounded-full border border-border bg-surface px-3 text-xs font-bold text-brand transition hover:bg-surface-dim dark:text-brand-light"
              >
                도감에서 찾아보기
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
