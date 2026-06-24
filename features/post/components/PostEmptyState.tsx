/**
 * File Name : features/post/components/PostEmptyState.tsx
 * Description : 게시글 빈 상태 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   게시글 비어있을 때 UI 추가
 * 2025.07.04  임도헌   Modified  검색 조건별 안내 메시지 개선
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 및 디자인 통일
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.27  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.06  임도헌   Modified  Empty State 문구 톤과 CTA 크기를 제품/스트림과 동일한 리듬으로 통일
 * 2026.03.06  임도헌   Modified  Empty/Error 상태 공통 레이아웃 유틸을 적용해 상태 화면 정합성을 높임
 * 2026.03.14  임도헌   Modified  현재 지역 범위가 좁을 때 범위를 넓혀보라는 힌트 문구를 추가
 * 2026.03.28  임도헌   Modified  장문 검색어가 빈 상태 카드에서 넘치지 않도록 제품과 동일한 검색 empty state 문법으로 통일
 * 2026.03.28  임도헌   Modified  검색어를 제목 대신 보조 문구로 다시 노출해 제품 empty state와 검색 피드백 문법을 통일
 * 2026.03.30  임도헌   Modified  게시글 카테고리 plain 라벨 정리에 맞춰 empty state 기본 문구를 일반 게시글 기준으로 조정
 * 2026.06.15  임도헌   Modified  검색어+카테고리 0건 상태를 순수 검색 0건과 구분해 안내
 */
"use client";

import { POST_CATEGORY, PostCategoryType } from "@/features/post/constants";
import {
  PlusIcon,
  DocumentMagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import type { RegionRange } from "@/generated/prisma/enums";

interface PostEmptyStateProps {
  keyword?: string;
  category?: string;
  currentRange?: RegionRange;
}

/**
 * 게시글 목록이 비어있을 때 표시되는 UI
 * - 검색어, 카테고리 필터 여부에 따라 적절한 안내 메시지를 표시
 * - 게시글 작성 버튼을 제공
 */
export default function PostEmptyState({
  keyword,
  category,
  currentRange,
}: PostEmptyStateProps) {
  let message = "작성된 게시글이 없습니다.";
  let subMessage = "첫 번째 게시글을 작성해보세요!";
  let keywordHint: string | null = null;
  const isNarrowRange = currentRange === "DONG" || currentRange === "GU";
  const categoryLabel = category
    ? POST_CATEGORY[category as PostCategoryType]
    : null;
  const hasKeywordWithCategory = Boolean(keyword && categoryLabel);
  const keywordOnlyHref = keyword
    ? `/posts?keyword=${encodeURIComponent(keyword)}`
    : "/posts";

  if (hasKeywordWithCategory) {
    message = "조건에 맞는 게시글이 없습니다.";
    subMessage = "검색어는 유지하고 카테고리를 넓혀보세요.";
    keywordHint = `'${keyword}' 검색 결과 중 ${categoryLabel} 카테고리에 맞는 글을 찾지 못했어요.`;
  } else if (keyword) {
    message = "검색 결과가 없습니다.";
    subMessage = isNarrowRange
      ? "다른 키워드로 검색하거나, 동네 범위를 넓혀 다시 확인해보세요."
      : "다른 키워드로 검색해보세요.";
    keywordHint = `'${keyword}'에 대한 결과를 찾지 못했어요.`;
  } else if (categoryLabel) {
    message = `'${categoryLabel}'에 게시글이 없습니다.`;
    subMessage = isNarrowRange
      ? "이 카테고리의 글이 근처엔 아직 없습니다. 동네 범위를 넓혀보세요."
      : "이 카테고리의 첫 글을 작성해보세요!";
  }

  return (
    <div className="state-screen">
      <div className="state-card">
        <div className="state-icon-wrap">
          <DocumentMagnifyingGlassIcon className="size-10 text-muted/50" />
        </div>

        <div>
          <p className="state-title">{message}</p>
          <p className="state-description">{subMessage}</p>
          {keywordHint && (
            <p className="mt-2 break-all text-xs font-medium leading-5 text-muted/90 line-clamp-2 sm:line-clamp-3">
              {keywordHint}
            </p>
          )}
        </div>

        <div className="state-actions justify-center">
          {hasKeywordWithCategory && (
            <Link
              href={keywordOnlyHref}
              className="btn-secondary inline-flex min-h-[44px] items-center justify-center px-6 text-sm"
            >
              카테고리 풀고 보기
            </Link>
          )}
          <Link
            href="/posts/add"
            className="btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-6 text-sm shadow-sm"
          >
            <PlusIcon className="w-5 h-5" />
            <span>게시글 작성하기</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
