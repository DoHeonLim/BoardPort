/**
 * File Name : features/stream/components/StreamEmptyState.tsx
 * Description : 스트리밍 목록 Empty 상태
 * Author : 임도헌
 *
 * History
 * 2025.08.25  임도헌   Created
 * 2025.09.10  임도헌   Modified  a11y(role/aria-live) 및 복구 링크(필터 초기화/전체 보기) 추가
 * 2026.01.14  임도헌   Modified  [UI] 공통 Empty State 디자인 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.26  임도헌   Modified  다크모드 가시성 개선
 * 2026.03.06  임도헌   Modified  Empty State 배경/보더 대비를 시맨틱 토큰 기준으로 재정렬
 * 2026.03.06  임도헌   Modified  기본 Empty State에 CTA를 추가하고 문구/버튼 배치를 제품·게시글과 통일
 * 2026.03.06  임도헌   Modified  Empty/Error 상태 공통 레이아웃 유틸을 적용해 상태 화면 정합성을 높임
 * 2026.03.14  임도헌   Modified  기본 Empty State 문구를 등대방송 톤에 맞게 가볍게 다듬되 기능 중심 흐름은 유지
 * 2026.03.28  임도헌   Modified  검색 empty state 문법을 제품/게시글과 통일하고 검색어는 보조 문구로 재배치
 * 2026.03.28  임도헌   Modified  스트림 모드(라이브/다시보기)에 따라 제목/설명/CTA를 분기하도록 확장
 * 2026.04.16  임도헌   Modified  빈 상태 CTA 링크 자동 prefetch를 끄고 실제 선택 시 이동하도록 정리
 * 2026.05.08  임도헌   Modified  스트림 조회 범위 타입을 StreamScope 공용 타입으로 교체
 * 2026.06.16  임도헌   Modified  검색어+카테고리/팔로잉 0건 상태를 순수 검색 0건과 구분해 안내
 */
import Link from "next/link";
import { VideoCameraIcon } from "@heroicons/react/24/outline";
import { STREAM_CATEGORY } from "@/features/stream/constants";
import type { StreamMode, StreamScope } from "@/features/stream/types";

interface Props {
  keyword?: string;
  category?: string;
  scope?: StreamScope;
  mode?: StreamMode;
}

/**
 * 스트리밍 목록이 비어있을 때 표시되는 UI
 * 검색어, 카테고리, 팔로잉 스코프 여부에 따라 적절한 안내 메시지를 표시
 * 빈 상태 CTA는 목록 최초 렌더 비용을 키우지 않도록 모두 의도 기반 이동으로만 동작
 */
export default function StreamEmptyState({
  keyword,
  category,
  scope,
  mode = "live",
}: Props) {
  const hasKeyword = !!keyword;
  const hasCategory = !!category;
  const isFollowingScope = scope === "following";
  const isRecordingMode = mode === "recordings";
  const hasKeywordWithRefinement =
    hasKeyword && (hasCategory || isFollowingScope);
  const categoryLabel = category
    ? STREAM_CATEGORY[category as keyof typeof STREAM_CATEGORY]
    : null;
  const targetLabel = isRecordingMode ? "다시보기" : "방송";
  const conditionLabel = [
    categoryLabel ? "카테고리" : null,
    isFollowingScope ? "팔로잉 범위" : null,
  ]
    .filter(Boolean)
    .join("이나 ");
  const keywordHint = hasKeyword
    ? hasKeywordWithRefinement
      ? `'${keyword}' 검색 결과 중 현재 조건에 맞는 ${targetLabel}를 찾지 못했어요.`
      : `'${keyword}'에 대한 ${targetLabel}를 찾지 못했어요.`
    : null;
  const resetRefinementHref = (() => {
    const params = new URLSearchParams();
    if (isRecordingMode) params.set("mode", "recordings");
    if (keyword) params.set("keyword", keyword);

    return params.toString() ? `/streams?${params.toString()}` : "/streams";
  })();

  let title = isRecordingMode
    ? "등록된 다시보기가 없습니다."
    : "진행 중인 방송이 없습니다.";
  let description = isRecordingMode
    ? "방송이 종료되고 준비가 끝난 다시보기가 여기에 표시됩니다."
    : "새로운 신호를 시작해보세요.";

  if (hasKeywordWithRefinement) {
    title = "조건에 맞는 결과가 없습니다.";
    description = conditionLabel
      ? `검색어는 유지하고 ${conditionLabel}를 넓혀보세요.`
      : `검색어는 유지하고 ${targetLabel} 범위를 넓혀보세요.`;
  } else if (hasKeyword) {
    title = "검색 결과가 없습니다.";
    description = isFollowingScope
      ? `다른 키워드로 검색하거나, 전체 ${targetLabel}으로 범위를 넓혀보세요.`
      : `다른 키워드로 ${targetLabel}을 검색해보세요.`;
  } else if (hasCategory) {
    title = `이 카테고리 ${targetLabel}이 없습니다.`;
    description = isFollowingScope
      ? `팔로잉 중인 ${targetLabel}이 없어 다른 카테고리나 전체 목록을 확인해보세요.`
      : "다른 카테고리를 확인해보세요.";
  } else if (isFollowingScope) {
    title = isRecordingMode
      ? "팔로잉 다시보기가 없습니다."
      : "팔로잉 방송이 없습니다.";
    description = isRecordingMode
      ? "관심 있는 스트리머를 팔로우해 지난 방송과 새 신호를 함께 받아보세요."
      : "관심 있는 스트리머를 팔로우해 새 신호를 받아보세요.";
  }

  return (
    <div className="state-screen">
      <div className="state-card">
        <div className="state-icon-wrap">
          <VideoCameraIcon className="size-10 text-muted/50" />
        </div>

        <div>
          <h3 className="state-title">{title}</h3>
          <p className="state-description">{description}</p>
          {keywordHint && (
            <p className="mt-2 break-all text-xs font-medium leading-5 text-muted/90 line-clamp-2 sm:line-clamp-3">
              {keywordHint}
            </p>
          )}
        </div>

        <div className="state-actions justify-center">
          {!hasKeyword && !hasCategory && !isFollowingScope && (
            <Link
              href={isRecordingMode ? "/streams?mode=live" : "/streams/add"}
              prefetch={false}
              className="btn-primary inline-flex min-h-[44px] items-center justify-center px-6 text-sm"
            >
              {isRecordingMode ? "라이브 보러가기" : "방송 시작하기"}
            </Link>
          )}
          {hasKeywordWithRefinement && (
            <Link
              href={resetRefinementHref}
              prefetch={false}
              className="btn-secondary inline-flex min-h-[44px] items-center justify-center px-6 text-sm"
            >
              조건 풀고 보기
            </Link>
          )}
          {(hasKeyword || hasCategory) && !hasKeywordWithRefinement && (
            <Link
              href={isRecordingMode ? "/streams?mode=recordings" : "/streams"}
              prefetch={false}
              className="btn-secondary inline-flex min-h-[44px] items-center justify-center px-6 text-sm"
            >
              전체 목록 보기
            </Link>
          )}
          {isFollowingScope && !hasKeyword && !hasCategory && (
            <Link
              href={isRecordingMode ? "/streams?mode=recordings" : "/streams"}
              prefetch={false}
              className="btn-primary inline-flex min-h-[44px] items-center justify-center px-6 text-sm"
            >
              {isRecordingMode ? "전체 다시보기 보기" : "전체 방송 보기"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
