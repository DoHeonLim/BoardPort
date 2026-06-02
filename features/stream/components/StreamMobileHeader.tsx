/**
 * File Name : features/stream/components/StreamMobileHeader.tsx
 * Description : 스트림 탭 모바일 전용 헤더
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.11  임도헌   Created   스트림 탭 모바일 헤더를 검색/알림 + 스코프/카테고리 2단 구조로 분리
 * 2026.03.11  임도헌   Modified  공용 useHideableHeader 훅을 적용해 스크롤 숨김/재노출 동작을 제품 탭과 통일
 * 2026.03.11  임도헌   Modified  좁은 모바일 폭에서 스코프 버튼이 카테고리 영역을 과도하게 침범하지 않도록 밀도 조정
 * 2026.03.12  임도헌   Modified  검색/알림, 스코프, 카테고리를 분리한 3단 모바일 헤더 구조로 재정렬
 * 2026.03.14  임도헌   Modified  3단 구조는 유지하되 각 행의 패딩과 높이를 압축해 모바일 가시 영역을 확보
 * 2026.03.19  임도헌   Modified  3단 구조는 유지하되 스코프/카테고리 행의 박스 밀도와 간격을 한 단계 낮춰 세로 점유를 완화
 * 2026.03.21  임도헌   Modified  모바일 헤더를 2단 구조로 압축하고 카테고리 전체 목록은 바텀시트로 이동
 * 2026.03.21  임도헌   Modified  카테고리 버튼 라벨을 짧게 줄이고 최소 너비를 낮춰 아주 좁은 모바일 폭 밀도를 보강
 * 2026.03.28  임도헌   Modified  카테고리 버튼과 바텀시트 선택 상태를 스코프 탭과 동일한 flat/neutral active 문법으로 통일해 라이트·다크 정합성 보강
 * 2026.03.28  임도헌   Modified  라이브/다시보기 최상단 모드 탭을 추가해 스트림 탐색 구조를 분리
 * 2026.03.29  임도헌   Modified  다시보기 전용 2차 제어를 최신/인기로 전환하고 팔로잉은 보조 필터 칩으로 분리
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 모바일 제어 칩 타이포를 text-xs/500 기준으로 정리
 * 2026.04.16  임도헌   Modified  spacer 기본 높이를 예약해 초기 CLS를 줄이고 상단 링크 프리패치를 완화
 * 2026.04.20  임도헌   Modified  모바일 카테고리 시트 포커스를 공용 링 톤으로 통일하고 다시보기 팔로잉 필터 active 대비를 보강
 * 2026.04.20  임도헌   Modified  좁은 모바일 폭에서도 다시보기 제어줄이 깨지지 않도록 필터 버튼 최소 너비와 패딩을 압축
 * 2026.05.08  임도헌   Modified  스트림 조회 범위 타입을 StreamScope 공용 타입으로 교체
 * 2026.05.30  임도헌   Modified  모바일 스트림 3행 필터 헤더의 행 간격과 spacer 기준 높이 압축
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import BottomSheet from "@/components/global/BottomSheet";
import NotificationBell from "@/components/global/NotificationBell";
import StreamModeTabs from "@/features/stream/components/StreamModeTabs";
import StreamSearchBarWrapper from "@/features/stream/components/StreamSearchBarWrapper";
import { STREAM_CATEGORY } from "@/features/stream/constants";
import { useHideableHeader } from "@/hooks/useHideableHeader";
import { cn } from "@/lib/utils";
import type {
  RecordingSort,
  StreamMode,
  StreamScope,
} from "@/features/stream/types";

const DEFAULT_MOBILE_HEADER_HEIGHT = 120;

interface StreamMobileHeaderProps {
  viewerId: number;
  unreadCount: number;
  mode: StreamMode;
  scope: StreamScope;
  recordingSort: RecordingSort;
  category?: string;
  keyword?: string;
}

/**
 * 스트림 탭 모바일 전용 헤더
 *
 * [구성]
 * - 1행: 라이브/다시보기 모드 전환
 * - 2행: 검색 진입 + 알림
 * - 3행: 스코프/정렬 + 카테고리 선택 버튼
 *
 * [동작]
 * - 공용 `useHideableHeader` 훅으로 스크롤 시 숨김/재노출 처리
 * - 카테고리 전체 목록은 바텀시트에서 선택해 세로 점유를 낮춤
 */
export default function StreamMobileHeader({
  viewerId,
  unreadCount,
  mode,
  scope,
  recordingSort,
  category,
  keyword,
}: StreamMobileHeaderProps) {
  const { headerRef, headerHeight, isVisible } =
    useHideableHeader<HTMLElement>();
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);

  /**
   * 스코프 변경 시 현재 keyword/category는 유지한 채 scope만 갱신
   */
  const buildHref = (nextScope: StreamScope) => {
    const sp = new URLSearchParams();
    if (mode !== "live") sp.set("mode", mode);
    if (mode === "recordings" && recordingSort !== "latest") {
      sp.set("sort", recordingSort);
    }
    if (category) sp.set("category", category);
    if (keyword) sp.set("keyword", keyword);
    if (nextScope !== "all") sp.set("scope", nextScope);
    const q = sp.toString();
    return q ? `/streams?${q}` : "/streams";
  };

  /**
   * 카테고리 변경 시 현재 keyword/scope는 유지한 채 category만 갱신
   */
  const buildCategoryHref = (nextCategory?: string) => {
    const sp = new URLSearchParams();
    if (mode !== "live") sp.set("mode", mode);
    if (mode === "recordings" && recordingSort !== "latest") {
      sp.set("sort", recordingSort);
    }
    if (keyword) sp.set("keyword", keyword);
    if (scope !== "all") sp.set("scope", scope);
    if (nextCategory) sp.set("category", nextCategory);
    const q = sp.toString();
    return q ? `/streams?${q}` : "/streams";
  };

  const buildModeHref = (nextMode: StreamMode) => {
    const sp = new URLSearchParams();
    if (nextMode !== "live") sp.set("mode", nextMode);
    if (nextMode === "recordings" && recordingSort !== "latest") {
      sp.set("sort", recordingSort);
    }
    if (keyword) sp.set("keyword", keyword);
    if (category) sp.set("category", category);
    if (nextMode === "live" && scope !== "all") sp.set("scope", scope);
    const q = sp.toString();
    return q ? `/streams?${q}` : "/streams";
  };

  const buildRecordingSortHref = (nextSort: RecordingSort) => {
    const sp = new URLSearchParams();
    sp.set("mode", "recordings");
    if (keyword) sp.set("keyword", keyword);
    if (category) sp.set("category", category);
    if (scope === "following") sp.set("scope", "following");
    if (nextSort !== "latest") sp.set("sort", nextSort);
    const q = sp.toString();
    return q ? `/streams?${q}` : "/streams";
  };

  const buildRecordingFollowingHref = (nextFollowingOnly: boolean) => {
    const sp = new URLSearchParams();
    sp.set("mode", "recordings");
    if (keyword) sp.set("keyword", keyword);
    if (category) sp.set("category", category);
    if (recordingSort !== "latest") sp.set("sort", recordingSort);
    if (nextFollowingOnly) sp.set("scope", "following");
    const q = sp.toString();
    return q ? `/streams?${q}` : "/streams";
  };

  const selectedCategoryLabel =
    (category && STREAM_CATEGORY[category as keyof typeof STREAM_CATEGORY]) ||
    "카테고리";
  const selectedCategoryButtonLabel =
    category === "GAME_PLAY"
      ? "게임"
      : category === "REVIEW"
        ? "리뷰"
        : category === "WORKTHROUGH"
          ? "공략"
          : category === "COMMUNITY"
            ? "커뮤"
            : "카테고리";

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          "fixed inset-x-0 top-0 z-30 border-b border-border-subtle bg-background px-3 pt-1.5 pb-1 shadow-sm transition-transform duration-300 ease-out"
        )}
        style={{
          transform: isVisible
            ? "translateY(0)"
            : "translateY(calc(-100% - 8px))",
        }}
      >
        <div className="flex items-center gap-2">
          <StreamModeTabs
            mode={mode}
            liveHref={buildModeHref("live")}
            recordingsHref={buildModeHref("recordings")}
            compact
          />
        </div>

        <div className="mt-1 flex items-center gap-2">
          <StreamSearchBarWrapper
            className="flex-1"
            compact
            placeholder={mode === "recordings" ? "다시보기 검색" : "방송 검색"}
          />

          <div className="shrink-0">
            <NotificationBell userId={viewerId} initialCount={unreadCount} />
          </div>
        </div>

        <div className="mt-1 flex items-center gap-1.5 sm:gap-2">
          {mode === "live" ? (
            <nav
              aria-label="보기 범위"
              className="min-w-0 flex-1 rounded-xl border border-border-subtle bg-background p-0.5"
            >
              <div className="flex items-center">
                <Link
                  href={buildHref("all")}
                  prefetch={false}
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium transition-[background-color,color,border-color,box-shadow]",
                    scope === "all"
                      ? "bg-surface text-brand dark:text-brand-light shadow-sm ring-1 ring-border/60"
                      : "text-muted hover:bg-background/70 hover:text-primary"
                  )}
                >
                  전체
                </Link>
                <Link
                  href={buildHref("following")}
                  prefetch={false}
                  className={cn(
                    "flex flex-1 items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium transition-[background-color,color,border-color,box-shadow]",
                    scope === "following"
                      ? "bg-surface text-brand dark:text-brand-light shadow-sm ring-1 ring-border/60"
                      : "text-muted hover:bg-background/70 hover:text-primary"
                  )}
                >
                  팔로잉
                </Link>
              </div>
            </nav>
          ) : (
            <>
              <nav
                aria-label="다시보기 정렬"
                className="min-w-0 flex-1 rounded-xl border border-border-subtle bg-background p-0.5"
              >
                <div className="flex items-center">
                  <Link
                    href={buildRecordingSortHref("latest")}
                    prefetch={false}
                    className={cn(
                      "flex flex-1 items-center justify-center rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-[background-color,color,border-color,box-shadow] sm:px-3 sm:text-xs",
                      recordingSort === "latest"
                        ? "bg-surface text-brand dark:text-brand-light shadow-sm ring-1 ring-border/60"
                        : "text-muted hover:bg-background/70 hover:text-primary"
                    )}
                  >
                    최신
                  </Link>
                  <Link
                    href={buildRecordingSortHref("popular")}
                    prefetch={false}
                    className={cn(
                      "flex flex-1 items-center justify-center rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-[background-color,color,border-color,box-shadow] sm:px-3 sm:text-xs",
                      recordingSort === "popular"
                        ? "bg-surface text-brand dark:text-brand-light shadow-sm ring-1 ring-border/60"
                        : "text-muted hover:bg-background/70 hover:text-primary"
                    )}
                  >
                    인기
                  </Link>
                </div>
              </nav>
              <Link
                href={buildRecordingFollowingHref(scope !== "following")}
                prefetch={false}
                className={cn(
                  "focus-ring-soft inline-flex min-h-[38px] shrink-0 items-center justify-center rounded-xl border px-2.5 text-[11px] font-medium transition-[background-color,color,border-color,box-shadow] sm:px-3 sm:text-xs",
                  scope === "following"
                    ? "border-brand/20 bg-brand/10 text-brand shadow-sm ring-1 ring-brand/20 dark:border-brand-light/25 dark:bg-brand-light/12 dark:text-brand-light dark:ring-brand-light/25"
                    : "border-border-subtle bg-surface/50 text-muted hover:bg-surface hover:text-primary"
                )}
              >
                팔로잉만
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setCategorySheetOpen(true)}
            className={cn(
              "inline-flex min-h-[38px] min-w-[84px] items-center justify-between gap-1.5 rounded-xl border px-2.5 text-[11px] font-medium transition-colors sm:min-w-[96px] sm:gap-2 sm:px-3 sm:text-sm",
              category
                ? "border-border-subtle bg-surface text-brand shadow-sm ring-1 ring-border/60 dark:text-brand-light"
                : "border-border-subtle bg-surface/50 text-muted hover:bg-surface hover:text-primary"
            )}
            aria-haspopup="dialog"
            aria-expanded={categorySheetOpen}
            aria-label="카테고리 선택"
          >
            <span className="min-w-0 truncate">
              {category ? selectedCategoryButtonLabel : selectedCategoryLabel}
            </span>
            <ChevronDownIcon className="size-4 shrink-0" />
          </button>
        </div>
      </header>

      <div
        aria-hidden="true"
        className="grid overflow-hidden"
        style={{
          gridTemplateRows: isVisible
            ? `${Math.max(headerHeight, DEFAULT_MOBILE_HEADER_HEIGHT)}px`
            : "0px",
        }}
      >
        <div />
      </div>

      <BottomSheet
        open={categorySheetOpen}
        title="카테고리 선택"
        description="보고 싶은 방송 주제를 골라 필터링하세요."
        onClose={() => setCategorySheetOpen(false)}
        contentClassName="pt-3"
      >
        <div className="space-y-2 py-1">
          <Link
            href={buildCategoryHref(undefined)}
            prefetch={false}
            onClick={() => setCategorySheetOpen(false)}
            className={cn(
              "focus-ring-soft flex min-h-[52px] items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-[background-color,color,border-color,box-shadow]",
              !category
                ? "border-border-subtle bg-surface text-brand shadow-sm ring-1 ring-border/60 dark:text-brand-light"
                : "border-border-subtle bg-surface text-primary hover:bg-surface-dim"
            )}
          >
            <span>전체</span>
            {!category && (
              <CheckIcon className="size-4 shrink-0 text-brand dark:text-brand-light" />
            )}
          </Link>

          {Object.entries(STREAM_CATEGORY).map(([key, label]) => {
            const isActive = category === key;
            return (
              <Link
                key={key}
                href={buildCategoryHref(key)}
                prefetch={false}
                onClick={() => setCategorySheetOpen(false)}
                className={cn(
                  "focus-ring-soft flex min-h-[52px] items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-[background-color,color,border-color,box-shadow]",
                  isActive
                    ? "border-border-subtle bg-surface text-brand shadow-sm ring-1 ring-border/60 dark:text-brand-light"
                    : "border-border-subtle bg-surface text-primary hover:bg-surface-dim"
                )}
              >
                <span>{label}</span>
                {isActive && (
                  <CheckIcon className="size-4 shrink-0 text-brand dark:text-brand-light" />
                )}
              </Link>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
