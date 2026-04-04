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
 */
"use client";

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
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import { cn } from "@/lib/utils";
import type { Badge } from "@/features/user/types";

interface ProfileBadgesModalProps {
  isOpen: boolean;
  closeModal: () => void;
  badges: Badge[];
  userBadges: Badge[];
}

/**
 * 개별 뱃지 아이템 (Tooltip 포함)
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

  // 1. Floating UI 설정: 툴팁 위치 및 동작 제어
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
      {/* 뱃지 아이콘 */}
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
          "flex aspect-square w-full flex-col items-center justify-center rounded-xl border p-2.5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 sm:p-3",
          isEarned
            ? "bg-brand/5 border-brand/20 dark:bg-brand-light/10 dark:border-brand-light/20"
            : "bg-surface-dim/30 border-border opacity-50 grayscale",
          !showDesktopTooltip &&
            selected &&
            "border-brand/35 bg-brand/10 shadow-sm ring-2 ring-brand/15 dark:border-brand-light/35 dark:bg-brand-light/12 dark:ring-brand-light/20"
        )}
      >
        <div className="relative mb-1.5 h-10 w-10 sm:mb-2 sm:h-12 sm:w-12">
          <Image
            src={`${badge.icon}/public`}
            alt={badge.name}
            fill
            className="object-contain"
          />
        </div>
        <span
          className={cn(
            "text-[10px] text-center font-medium leading-tight sm:text-[11px]",
            isEarned ? "text-primary" : "text-muted"
          )}
          >
            {getBadgeKoreanName(badge.name)}
          </span>
      </button>

      {/* 툴팁 (Hover 시 표시) */}
      {showDesktopTooltip && isOpen && (
        <div
          ref={refs.setFloating}
          role="tooltip"
          style={{ ...floatingStyles, zIndex: 9999 }}
          className="max-w-[280px] rounded-xl border border-border-strong bg-background px-4 py-3.5 text-sm leading-relaxed text-primary shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
        >
          <div className="mb-1.5 font-bold text-primary">
            {getBadgeKoreanName(badge.name)}
          </div>
          <p className="text-muted">{badge.description}</p>
          <FloatingArrow
            ref={setArrowRef}
            context={context}
            className="fill-background"
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
 * 2. 사용자가 획득한 뱃지는 활성화 상태로 표시
 * 3. 각 뱃지에 마우스를 올리면 상세 설명 툴팁을 보여줌
 */
export default function ProfileBadgesModal({
  isOpen,
  closeModal,
  badges,
  userBadges,
}: ProfileBadgesModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [showDesktopTooltip, setShowDesktopTooltip] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState<number | null>(null);

  // 접근성 (포커스 & 스크롤락 & ESC 닫기)
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, closeModal]);

  // 획득 뱃지 Set (빠른 조회를 위해)
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
          "relative w-full sm:max-w-3xl bg-surface shadow-2xl overflow-hidden outline-none flex flex-col",
          "h-[80dvh] rounded-t-2xl sm:rounded-2xl",
          "border-t sm:border border-border-subtle"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle bg-surface px-5 py-4 sm:px-6">
          <h2 id="badges-title" className="text-lg font-bold text-primary">
            뱃지 컬렉션 ({userBadges.length}/{badges.length})
          </h2>
          <button
            onClick={closeModal}
            className="p-2 -mr-2 text-muted hover:text-primary hover:bg-surface-dim rounded-full transition-colors"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {!showDesktopTooltip && selectedBadge && (
          <div className="shrink-0 border-b border-border-subtle bg-surface px-5 py-4 sm:hidden">
            <div className="rounded-xl border border-border-subtle bg-background px-4 py-3.5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-primary">
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
        )}

        <div className="flex-1 overflow-y-auto p-5 scrollbar-hide sm:p-6">
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5">
            {badges.map((badge) => (
              <BadgeItem
                key={badge.id}
                badge={badge}
                isEarned={earnedSet.has(badge.id)}
                showDesktopTooltip={showDesktopTooltip}
                selected={selectedBadge?.id === badge.id}
                onSelect={() => setSelectedBadgeId(badge.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
