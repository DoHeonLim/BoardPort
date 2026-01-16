/**
 * File Name : components/follow/FollowListModal
 * Description : 팔로워/팔로잉 목록 모달 (SSOT: row 상태는 user.*만 신뢰)
 * Author : 임도헌
 *
 * Key Points
 * - SSOT(단일 소스):
 *   - 버튼(토글) 상태는 FollowListUser.isFollowedByViewer만 신뢰한다. (viewer -> rowUser)
 *   - 섹션 분리(맞팔로잉/나머지)는 FollowListUser.isMutualWithOwner만 사용한다. owner 기준으로 통일
 *     - followers 모달: owner가 rowUser를 팔로우하면 true (owner -> rowUser)
 *     - following 모달: rowUser가 owner를 팔로우하면 true (rowUser -> owner)
 * - self(viewerId) 처리:
 *   - self row는 숨기지 않는다.
 *   - "나" 뱃지는 FollowListItem이 책임진다.
 * - 무한스크롤:
 *   - 더보기(more) 에러 상태에서 sentinel이 계속 보이면 무한 재호출 루프가 날 수 있어
 *     enabled를 끄는 방식으로 자동 트리거를 중단한다.
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.22  임도헌   Created
 * 2025.05.22  임도헌   Modified  Tailwind 스타일로 변경
 * 2025.05.22  임도헌   Modified  UserAvatar 컴포넌트 사용
 * 2025.09.08  임도헌   Modified  viewerId/viewerFollowingIds/onViewerFollowChange 지원
 * 2025.09.14  임도헌   Modified  a11y/UX 보강(Esc 닫기, 포커스 관리, 스크롤 잠금, 스크롤 영역 일관화)
 * 2025.09.19  임도헌   Modified  유저 팔로우, 팔로잉 무한스크롤 기능 추가
 * 2025.10.12  임도헌   Modified  users 타입 정합(FollowListUser), useInfiniteScroll rootRef 적용,
 *                                isFollowing 계산(followingSet 우선, 없으면 user.isFollowedByViewer)
 * 2025.10.12  임도헌   Modified  viewerFollowingIds/Set/compute 제거, isFollowedByViewer만 사용
 * 2025.10.29  임도헌   Modified  Tab 포커스 트랩, 무한스크롤 hasMore 가드, 로우 버튼 a11y(aria-busy/pressed) 전달 보강
 * 2025.12.20  임도헌   Modified  FollowListItem 단일 소스화 반영(로컬 following 제거, 토글은 컨트롤러로)
 * 2025.12.20  임도헌   Modified  onToggle 핸들러 래핑 제거 + aria-live 상태 안내 추가
 * 2025.12.23  임도헌   Modified  error stage(first/more) UI 분기 + more일 때 무한스크롤 루프 방지
 * 2026.01.05  임도헌   Modified  레이어링 명시(클릭 이슈 방지) + owner 기준 맞팔 분리(isMutualWithOwner) 도입
 * 2026.01.06  임도헌   Modified  Key Points/용어 정리: isMutualWithOwner 기준 단일화 + self 숨김 규칙 제거
 * 2026.01.15  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용, 모바일 Full/데스크톱 Card 레이아웃 분기
 */

"use client";

import { useEffect, useMemo, useRef } from "react";
import FollowListItem from "./FollowListItem";
import type { FollowListUser } from "@/types/profile";
import { useInfiniteScroll } from "@/hooks/common/useInfiniteScroll";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

type FollowListError =
  | { stage: "first"; message: string }
  | { stage: "more"; message: string }
  | null;

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: FollowListUser[];
  title: string;
  kind: "followers" | "following";
  viewerId?: number;

  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => Promise<void>;
  loadingMore: boolean;

  onToggleItem?: (userId: number) => void | Promise<void>;
  isPendingById?: (id: number) => boolean;

  /** 페이징 에러(옵션): first/more 구분 */
  error?: FollowListError;
  onRetry?: () => void | Promise<void>;
}

export default function FollowListModal({
  isOpen,
  onClose,
  users,
  title,
  kind,
  viewerId,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  onToggleItem,
  isPendingById,
  error,
  onRetry,
}: FollowListModalProps) {
  const isMoreError = error?.stage === "more";
  const isFirstError = error?.stage === "first";

  /**
   * 맞팔로잉/나머지 분리
   * - 기준은 오직 owner <-> rowUser: user.isMutualWithOwner
   * - viewerId(self)는 숨기지 않는다. (FollowListItem이 "나" 뱃지 처리)
   */
  const { mutual, rest } = useMemo(() => {
    const mutual = users.filter((u) => u.isMutualWithOwner);
    const rest = users.filter((u) => !u.isMutualWithOwner);
    return { mutual, rest };
  }, [users]);

  // a11y & UX: 포커스 / ESC / body scroll lock
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // 1. 초기 포커스 저장 및 ESC 닫기, 스크롤 잠금
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // 모달에 포커스 이동 (스크린 리더가 인식하도록)
    setTimeout(() => dialogRef.current?.focus(), 0);

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener("keydown", handleKeyDown);
      // 닫힐 때 이전 포커스 복원
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose]);

  // 2. 포커스 트랩 (Tab 키 순환) - 복원됨
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const dialog = dialogRef.current;
    const getFocusables = () =>
      dialog.querySelectorAll<HTMLElement>(
        'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = getFocusables();
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener("keydown", onKeyDown);
    return () => dialog.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  // 무한 스크롤 연결
  useInfiniteScroll({
    triggerRef: sentinelRef,
    hasMore,
    isLoading: loadingMore,
    onLoadMore: onLoadMore ?? (async () => {}),
    enabled: isOpen && hasMore && !isMoreError,
    rootRef: scrollAreaRef,
    rootMargin: "400px 0px 0px 0px",
    threshold: 0.1,
  });

  if (!isOpen) return null;

  const titleId = `followlist-title-${kind}`;
  const restLabel = kind === "followers" ? "추천" : "팔로잉";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative w-full sm:max-w-md bg-surface shadow-2xl overflow-hidden outline-none flex flex-col",
          // [Mobile] Bottom Sheet 느낌 (하단에서 올라옴, 상단 둥글게)
          "h-[85vh] rounded-t-2xl animate-slide-up",
          // [Desktop] Center Card (중앙 정렬, 전체 둥글게)
          "sm:h-[600px] sm:rounded-2xl sm:animate-fade-in",
          "border-t sm:border border-border"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface shrink-0">
          <h2 id={titleId} className="text-lg font-bold text-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-muted hover:text-primary hover:bg-surface-dim rounded-full transition-colors"
            aria-label="닫기"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {/* Error Banner (Load More) */}
        {isMoreError && (
          <div className="px-4 py-2 bg-danger/10 text-danger text-sm text-center font-medium shrink-0">
            {error?.message}
            {!!onRetry && (
              <button
                onClick={onRetry}
                className="ml-2 underline hover:text-red-700"
              >
                다시 시도
              </button>
            )}
          </div>
        )}

        {/* List Area */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto p-4 scrollbar-hide"
        >
          {isLoading ? (
            <div className="py-10 flex justify-center">
              <div className="size-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-muted text-sm">
              {isFirstError ? (
                <div className="flex flex-col gap-2">
                  <p>{error?.message}</p>
                  {onRetry && (
                    <button onClick={onRetry} className="underline text-brand">
                      다시 시도
                    </button>
                  )}
                </div>
              ) : (
                <p>
                  {kind === "followers"
                    ? "아직 팔로워가 없습니다."
                    : "팔로우 중인 사용자가 없습니다."}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* 맞팔 섹션 */}
              {mutual.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 px-1">
                    맞팔로잉
                  </h3>
                  <div className="space-y-3">
                    {mutual.map((u) => (
                      <FollowListItem
                        key={u.id}
                        user={u}
                        viewerId={viewerId}
                        pending={isPendingById?.(u.id) ?? false}
                        onToggle={onToggleItem}
                        buttonVariant="primary"
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* 나머지 섹션 */}
              {rest.length > 0 && (
                <section>
                  {mutual.length > 0 && (
                    <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 px-1">
                      {restLabel}
                    </h3>
                  )}
                  <div className="space-y-3">
                    {rest.map((u) => (
                      <FollowListItem
                        key={u.id}
                        user={u}
                        viewerId={viewerId}
                        pending={isPendingById?.(u.id) ?? false}
                        onToggle={onToggleItem}
                        buttonVariant="outline"
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Infinite Scroll Trigger */}
              <div
                ref={sentinelRef}
                className="h-4 w-full"
                aria-hidden="true"
              />

              {loadingMore && (
                <div className="py-4 flex justify-center">
                  <div className="size-5 border-2 border-muted/30 border-t-muted rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
        {/* 하단 닫기 버튼 제거됨: 상단 X 버튼으로 대체 */}
      </div>
    </div>
  );
}
