/**
 * File Name : features/user/components/follow/FollowListModal.tsx
 * Description : 팔로워/팔로잉 목록 모달 (SSOT: row 상태는 user.*만 신뢰)
 * Author : 임도헌
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
 * 2026.01.17  임도헌   Moved     components/follow -> features/user/components/follow
 * 2026.01.29  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.01  임도헌   Modified  로딩 상태(isFetchingNextPage) Prop 적용 및 하단 스피너 분리
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.12  임도헌   Modified  공용 bodyScrollLock 유틸 적용으로 중첩 모달에서도 스크롤 잠금/복구 안정화
 * 2026.03.19  임도헌   Modified  외곽선과 그림자를 한 단계 낮춰 최근 프로필/알림 모달 톤과 시각 밀도를 통일
 * 2026.03.22  임도헌   Modified  모바일 모달 높이를 소폭 낮춰 세로가 낮은 화면에서 밀도를 완화
 * 2026.03.28  임도헌   Modified  적은 수의 항목에서도 과하게 비지 않도록 높이를 max-height 기반으로 조정하고 섹션/빈 상태 가독성 개선
 * 2026.03.28  임도헌   Modified  팔로워 모달의 비맞팔 섹션 라벨을 추천 대신 설명형 문구로 바꿔 기준을 명확화
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 */

import { useEffect, useMemo, useRef } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import FollowListItem from "@/features/user/components/follow/FollowListItem";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import { cn } from "@/lib/utils";
import type { FollowListUser } from "@/features/user/types";

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
  // React Query의 fetchNextPage와 호환되도록 unknown 반환 타입을 허용
  onLoadMore: () => Promise<unknown>;
  isFetchingNextPage: boolean;

  onToggleItem?: (userId: number) => void | Promise<void>;
  isPendingById?: (id: number) => boolean;

  error?: FollowListError;
  // React Query의 refetch 함수와 호환되도록 unknown 반환 타입을 허용
  onRetry?: () => void | Promise<unknown>;
}

/**
 * 팔로우 목록 모달 컴포넌트
 *
 * [상태 주입 및 상호작용 제어 로직]
 * - `useInfiniteScroll` 훅과 연동하여 모달 내 스크롤 이벤트를 감지하고 페이징 로딩 트리거 적용
 * - `isMutualWithOwner` 플래그를 활용하여 '맞팔로잉' 그룹과 일반 그룹으로 렌더링 섹션 동적 분리
 * - 에러 발생 시 상태(`isMoreError`, `isFirstError`)에 따른 재시도(Retry) UI 조건부 렌더링 제공
 * - ESC 키보드 이벤트, 이전 포커스 복원, 바디 스크롤 잠금 등 모달 접근성 흐름을 적용
 */
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
  isFetchingNextPage = false,
  onToggleItem,
  isPendingById,
  error,
  onRetry,
}: FollowListModalProps) {
  const isMoreError = error?.stage === "more";
  const isFirstError = error?.stage === "first";

  /**
   * 목록 렌더링 전 유저 분리 로직
   * - owner를 기준으로 한 맞팔(isMutualWithOwner) 여부를 기준으로 상단/하단 섹션을 나눔.
   */
  const { mutual, rest } = useMemo(() => {
    const mutual = users.filter((u) => u.isMutualWithOwner);
    const rest = users.filter((u) => !u.isMutualWithOwner);
    return { mutual, rest };
  }, [users]);

  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  /**
   * 접근성(A11y) 및 모달 인터랙션 설정
   * - 모달 열림 시 포커스를 이동하고, 기존 페이지의 스크롤을 막음.
   * - ESC 키를 눌렀을 때 모달을 닫고 이전 포커스를 복원
   */
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    setTimeout(() => dialogRef.current?.focus(), 0);

    lockBodyScroll();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose]);

  // 하단 스크롤 도달 시 다음 페이지 데이터 로딩을 위한 옵저버 연결
  useInfiniteScroll({
    triggerRef: sentinelRef,
    hasMore,
    isLoading: isFetchingNextPage,
    onLoadMore: onLoadMore,
    enabled: isOpen && hasMore && !isMoreError,
    rootRef: scrollAreaRef,
    rootMargin: "400px 0px 0px 0px",
    threshold: 0.1,
  });

  if (!isOpen) return null;

  const titleId = `followlist-title-${kind}`;
  const restLabel = kind === "followers" ? "나를 팔로우하는 사용자" : "팔로잉";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative w-full sm:max-w-md bg-surface shadow-xl overflow-hidden outline-none flex flex-col",
          "min-h-[280px] max-h-[80dvh] rounded-t-2xl animate-slide-up sm:max-h-[600px] sm:rounded-2xl",
          "border-t sm:border border-border-subtle"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-surface shrink-0">
          <h2 id={titleId} className="text-lg font-bold text-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="focus-ring-soft rounded-full p-2 -mr-2 text-muted hover:text-primary hover:bg-surface-dim transition-colors"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {/* 스크롤 페이징 중 에러 발생 시 렌더링되는 경고 배너 */}
        {isMoreError && (
          <div className="px-4 py-2 bg-danger/10 text-danger text-sm text-center font-medium shrink-0">
            {error?.message}
            {!!onRetry && (
              <button
                onClick={onRetry}
                className="focus-ring-soft ml-2 rounded-md underline hover:text-red-700"
              >
                다시 시도
              </button>
            )}
          </div>
        )}

        <div
          ref={scrollAreaRef}
          className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-hide"
        >
          {isLoading ? (
            <div className="py-10 flex justify-center">
              <div className="size-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-dim/20 py-12 px-5 text-center text-muted text-sm">
              {/* 초기 로딩 에러 시 재시도 버튼 렌더링 */}
              {isFirstError ? (
                <div className="flex flex-col gap-2">
                  <p>{error?.message}</p>
                  {onRetry && (
                    <button
                      onClick={onRetry}
                      className="focus-ring-soft rounded-md underline text-brand"
                    >
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
              {/* 맞팔로잉 유저 리스트 렌더링 */}
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

              {/* 그 외 유저 리스트 렌더링 */}
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

              {/* 스크롤 트리거 영역 */}
              <div
                ref={sentinelRef}
                className="h-4 w-full"
                aria-hidden="true"
              />

              {/* 스크롤 페이징 데이터 페칭 중 스피너 표시 */}
              {isFetchingNextPage && (
                <div className="py-4 flex justify-center">
                  <div className="size-5 border-2 border-muted/30 border-t-muted rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
