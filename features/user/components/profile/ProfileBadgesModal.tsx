/**
 * File Name : features/user/components/profile/ProfileBadgesModal.tsx
 * Description : 뱃지 목록 모달 (전체 뱃지 목록 및 획득 상태)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.31  임도헌   Created
 * 2024.12.31  임도헌   Modified  유저뱃지 모달 추가
 * 2025.01.12  임도헌   Modified  툴팁 위치 변경, 주석 추가
 * 2025.01.14  임도헌   Modified  useRole 접근성 기능 개선(tooltip 명시, 뱃지 아이템에 aria-describedby 추가, 툴팁에 role="tooltip" 및 aria-hidden 추가, 툴팁에 고유 id 추가)
 * 2025.01.14  임도헌   Modified  useHover로 부드러운 애니메이션 적용
 * 2025.01.14  임도헌   Modified  useDismiss로 툴팁의 닫힘 동작 케이스별로 제어
 * 2025.10.29  임도헌   Modified  tooltip 고유 ID 적용, userBadges→Set으로 성능 개선, dialog a11y/스크롤락/포커스 복원, 이미지 경로 정리
 * 2026.01.15  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 및 반응형 모달 레이아웃 적용
 * 2026.01.17  임도헌   Moved     components/profile -> features/user/components/profile
 * 2026.01.29  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.26  임도헌   Modified  모달 애니메이션 도중 툴팁 오작동 방지를 위해 autoUpdate 적용
 * 2026.03.08  임도헌   Modified  모달 진입 transform 애니메이션을 제거해 Floating UI 툴팁 위치가 초기 프레임부터 안정적으로 계산되도록 조정
 * 2026.03.12  임도헌   Modified  공용 bodyScrollLock 유틸 적용으로 중첩 모달에서도 스크롤 잠금/복구 안정화
 * 2026.03.12  임도헌   Modified  뱃지 툴팁을 시맨틱 토큰 기반 패널 톤으로 정리
 * 2026.03.14  임도헌   Modified  모바일에서 뱃지 타일 높이와 내부 패딩을 줄여 컬렉션 밀도를 보강
 * 2026.03.17  임도헌   Modified  다크/라이트 모드 모두에서 툴팁 가시성이 유지되도록 solid 패널 톤과 대비를 보강
 * 2026.03.22  임도헌   Modified  최근 프로필 모달 톤에 맞춰 높이 단위와 외곽선/헤더 보더 강도 정리
 * 2026.03.27  임도헌   Modified  모바일에서는 hover 툴팁 대신 선택된 뱃지 설명 패널을 사용하고 데스크톱 hover 툴팁 대비를 보강
 * 2026.04.08  임도헌   Modified  모바일에서는 공용 BottomSheet를 사용해 뱃지 전체 보기 흐름을 다른 프로필 오버레이와 통일
 * 2026.04.10  임도헌   Modified  profile 타이포 정책에 맞춰 뱃지 타일 라벨을 text-xs 기준으로 통일
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.04.18  임도헌   Modified  모바일 BottomSheet에서는 선택된 뱃지 설명 패널과 컬렉션 그리드를 같은 스크롤 흐름으로 묶어 읽기 맥락을 정리
 * 2026.04.18  임도헌   Modified  모바일에서는 선택된 뱃지 타일과 설명 패널이 같은 강조 언어를 쓰도록 연결감을 보강
 * 2026.04.18  임도헌   Modified  모바일에서 하단 배지를 선택하면 설명 패널이 보이도록 상단으로 부드럽게 스크롤하는 흐름 추가
 * 2026.04.18  임도헌   Modified  데스크톱 배지 모달 대비와 툴팁 화살표/박스 경계 표현을 보강해 가시성과 완성도를 높임
 * 2026.04.18  임도헌   Modified  미획득/선택 상태의 대비를 높여 라이트·다크 모드 모두에서 배지 가시성을 보강
 */

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { getBadgeKoreanName } from "@/features/user/utils/badge";
import {
  useFloating,
  offset,
  shift,
  flip,
  arrow,
  FloatingArrow,
  autoUpdate,
  type Placement,
} from "@floating-ui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import BottomSheet from "@/components/global/BottomSheet";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import { cn } from "@/lib/utils";
import type { Badge } from "@/features/user/types";
import { useIsMobile } from "@/hooks/useIsMobile";

interface ProfileBadgesModalProps {
  isOpen: boolean;
  closeModal: () => void;
  badges: Badge[];
  userBadges: Badge[];
}

/**
 * 개별 뱃지 타일
 *
 * - 데스크톱: hover/focus 시 Floating UI 툴팁 노출
 * - 모바일: 선택 상태를 타일 자체로 표시하고 상단 설명 패널과 연결
 */
function BadgeItem({
  badge,
  isEarned,
  showDesktopTooltip,
  selected,
  onSelect,
}: {
  badge: Badge;
  isEarned: boolean;
  showDesktopTooltip: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [arrowRef, setArrowRef] = useState<SVGSVGElement | null>(null);

  // Floating UI 설정: 데스크톱 툴팁 위치 및 화살표 정렬 제어
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "bottom" as Placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(10), // 타겟과 10px 간격
      flip({ padding: 10 }), // 화면 밖으로 나가면 반전
      shift({ padding: 10 }), // 화면 안으로 이동
      arrow({ element: arrowRef }),
    ],
  });

  useEffect(() => {
    if (!showDesktopTooltip) {
      setIsOpen(false);
    }
  }, [showDesktopTooltip]);

  return (
    <>
      {/* 뱃지 타일 */}
      <button
        type="button"
        ref={refs.setReference}
        onClick={onSelect}
        onMouseEnter={() => {
          if (showDesktopTooltip) setIsOpen(true);
        }}
        onMouseLeave={() => {
          if (showDesktopTooltip) setIsOpen(false);
        }}
        onFocus={() => {
          if (showDesktopTooltip) setIsOpen(true);
        }}
        onBlur={() => {
          if (showDesktopTooltip) setIsOpen(false);
        }}
        aria-label={`${getBadgeKoreanName(badge.name)} 설명 보기`}
        aria-pressed={!showDesktopTooltip ? selected : undefined}
        className={cn(
          "focus-ring-soft relative flex aspect-square w-full flex-col items-center justify-center rounded-xl border p-2.5 text-left transition-[background-color,color,border-color,box-shadow] sm:p-3",
          isEarned
            ? "bg-brand/5 border-brand/20 dark:bg-brand-light/10 dark:border-brand-light/20"
            : "bg-surface border-border text-muted/90",
          showDesktopTooltip &&
            "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.7)]",
          !showDesktopTooltip &&
            selected &&
            "border-brand/45 bg-brand/10 shadow-sm ring-2 ring-brand/20 dark:border-brand-light/45 dark:bg-brand-light/14 dark:ring-brand-light/25"
        )}
      >
        {!showDesktopTooltip && selected && (
          <>
            <span
              aria-hidden="true"
              className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-brand/70 dark:bg-brand-light/70"
            />
            <span className="absolute right-2 top-2 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm dark:bg-brand-light dark:text-slate-950">
              선택됨
            </span>
          </>
        )}
        <div className="relative mb-1.5 h-10 w-10 sm:mb-2 sm:h-12 sm:w-12">
          <Image
            src={`${badge.icon}/public`}
            alt={badge.name}
            fill
            className={cn(
              "object-contain",
              !isEarned && "grayscale opacity-75"
            )}
          />
        </div>
        <span
          className={cn(
            "text-xs text-center font-medium leading-tight",
            isEarned ? "text-primary" : "text-muted/85"
          )}
        >
          {getBadgeKoreanName(badge.name)}
        </span>
      </button>

      {/* 데스크톱 툴팁 */}
      {showDesktopTooltip && isOpen && (
        <div
          ref={refs.setFloating}
          role="tooltip"
          style={{ ...floatingStyles, zIndex: 9999 }}
          className="max-w-[296px] rounded-xl border border-border-strong bg-surface px-4 py-3.5 text-sm leading-relaxed text-primary shadow-[0_20px_48px_-24px_rgba(2,6,23,0.72)] ring-1 ring-white/5"
        >
          <div className="mb-1.5 text-sm font-bold text-primary">
            {getBadgeKoreanName(badge.name)}
          </div>
          <p className="text-primary/80">{badge.description}</p>
          <FloatingArrow
            ref={setArrowRef}
            context={context}
            className="fill-surface drop-shadow-[0_8px_14px_rgba(2,6,23,0.28)]"
            fill="var(--surface)"
            stroke="var(--border-strong)"
            strokeWidth={1}
          />
        </div>
      )}
    </>
  );
}

/**
 * 뱃지 목록 모달
 *
 * [기능]
 * 1. 전체 뱃지 목록을 그리드 형태로 렌더링
 * 2. 획득 여부와 선택 상태를 타일에 반영
 * 3. 데스크톱은 hover 툴팁, 모바일은 선택된 뱃지 설명 패널을 사용
 */
export default function ProfileBadgesModal({
  isOpen,
  closeModal,
  badges,
  userBadges,
}: ProfileBadgesModalProps) {
  const isMobile = useIsMobile();
  const dialogRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const [showDesktopTooltip, setShowDesktopTooltip] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState<number | null>(null);

  // 접근성: 데스크톱 모달 포커스, ESC 닫기, body scroll lock 관리
  useEffect(() => {
    if (!isOpen) return;
    if (isMobile) return;

    dialogRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKey);
    lockBodyScroll();
    return () => {
      window.removeEventListener("keydown", handleKey);
      unlockBodyScroll();
    };
  }, [closeModal, isMobile, isOpen]);

  // 획득 뱃지 Set (빠른 조회용)
  const earnedSet = useMemo(
    () => new Set(userBadges.map((b) => b.id)),
    [userBadges]
  );
  const initialSelectedBadgeId = useMemo(
    () => userBadges[0]?.id ?? badges[0]?.id ?? null,
    [userBadges, badges]
  );
  const selectedBadge = useMemo(
    () =>
      badges.find((badge) => badge.id === selectedBadgeId) ??
      badges.find((badge) => badge.id === initialSelectedBadgeId) ??
      null,
    [badges, selectedBadgeId, initialSelectedBadgeId]
  );

  useEffect(() => {
    if (!isOpen) return;
    setSelectedBadgeId(initialSelectedBadgeId);
  }, [isOpen, initialSelectedBadgeId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setShowDesktopTooltip(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!isOpen) return null;

  const selectedBadgePanel =
    !showDesktopTooltip && selectedBadge ? (
      <div className="mb-4 sm:hidden">
        <div className="overflow-hidden rounded-xl border border-brand/20 bg-background shadow-sm dark:border-brand-light/20">
          <div className="h-0.5 w-full bg-brand/70 dark:bg-brand-light/70" />
          <div className="px-4 py-3.5">
            <div className="flex items-start gap-3">
              <div className="relative mt-0.5 h-11 w-11 shrink-0 rounded-xl bg-brand/8 dark:bg-brand-light/10">
                <Image
                  src={`${selectedBadge.icon}/public`}
                  alt={selectedBadge.name}
                  fill
                  className={cn(
                    "object-contain p-1.5",
                    !earnedSet.has(selectedBadge.id) && "grayscale opacity-80"
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="inline-flex rounded-full bg-brand/12 px-2 py-1 text-[11px] font-semibold leading-none text-brand dark:bg-brand-light/15 dark:text-brand-light">
                  현재 선택한 뱃지
                </div>
                <div className="mt-2 text-sm font-bold text-primary">
                  {getBadgeKoreanName(selectedBadge.name)}
                </div>
                <div className="mt-1 text-xs font-medium text-muted">
                  {earnedSet.has(selectedBadge.id)
                    ? "획득한 뱃지"
                    : "아직 획득하지 않은 뱃지"}
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {selectedBadge.description}
            </p>
          </div>
        </div>
      </div>
    ) : null;

  const mobileCollectionLabel = !showDesktopTooltip ? (
    <div className="mb-3 sm:hidden">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted/80">
        All Badges
      </p>
    </div>
  ) : null;

  const badgesGrid = (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5">
      {badges.map((badge) => (
        <BadgeItem
          key={badge.id}
          badge={badge}
          isEarned={earnedSet.has(badge.id)}
          showDesktopTooltip={showDesktopTooltip}
          selected={selectedBadge?.id === badge.id}
          onSelect={() => {
            setSelectedBadgeId(badge.id);
            if (!showDesktopTooltip) {
              mobileScrollRef.current?.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }
          }}
        />
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={isOpen}
        onClose={closeModal}
        title={`뱃지 컬렉션 (${userBadges.length}/${badges.length})`}
        contentClassName="px-0 pb-0"
        panelClassName="max-h-[86dvh]"
      >
        <div
          ref={mobileScrollRef}
          className="max-h-[62dvh] overflow-y-auto px-4 pb-4 pt-4"
        >
          {selectedBadgePanel}
          {mobileCollectionLabel}
          {badgesGrid}
        </div>
      </BottomSheet>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={closeModal}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="badges-title"
        tabIndex={-1}
        className={cn(
          "relative w-full overflow-hidden outline-none flex flex-col bg-surface shadow-[0_36px_80px_-32px_rgba(2,6,23,0.82)] ring-1 ring-white/5",
          "sm:max-w-3xl",
          "h-[80dvh] rounded-t-2xl sm:rounded-2xl",
          "border-t sm:border border-border"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-5 py-4 sm:px-6">
          <h2 id="badges-title" className="text-lg font-bold text-primary">
            뱃지 컬렉션 ({userBadges.length}/{badges.length})
          </h2>
          <button
            onClick={closeModal}
            className="focus-ring-soft p-2 -mr-2 text-muted hover:text-primary hover:bg-surface-dim rounded-full transition-colors"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {selectedBadgePanel}

        <div className="flex-1 overflow-y-auto p-5 scrollbar-hide sm:p-6">
          {badgesGrid}
        </div>
      </div>
    </div>
  );
}
