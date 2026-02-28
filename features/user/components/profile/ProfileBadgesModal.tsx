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
  useHover,
  useDismiss,
  useRole,
  useInteractions,
  FloatingArrow,
  autoUpdate,
  type Placement,
} from "@floating-ui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
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
function BadgeItem({ badge, isEarned }: { badge: Badge; isEarned: boolean }) {
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

  // 2. 인터랙션 훅 결합 (Hover, Dismiss, Role)
  const hover = useHover(context, {
    move: false,
    delay: { open: 100, close: 200 },
    restMs: 40,
  });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    dismiss,
    role,
  ]);

  return (
    <>
      {/* 뱃지 아이콘 */}
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        className={cn(
          "flex flex-col items-center justify-center p-3 rounded-xl border transition-all aspect-square",
          isEarned
            ? "bg-brand/5 border-brand/20 dark:bg-brand-light/10 dark:border-brand-light/20"
            : "bg-surface-dim/30 border-border opacity-50 grayscale"
        )}
      >
        <div className="relative w-12 h-12 mb-2">
          <Image
            src={`${badge.icon}/public`}
            alt={badge.name}
            fill
            className="object-contain"
          />
        </div>
        <span
          className={cn(
            "text-[11px] text-center font-medium leading-tight",
            isEarned ? "text-primary" : "text-muted"
          )}
        >
          {getBadgeKoreanName(badge.name)}
        </span>
      </div>

      {/* 툴팁 (Hover 시 표시) */}
      {isOpen && (
        <div
          ref={refs.setFloating}
          {...getFloatingProps()}
          style={{ ...floatingStyles, zIndex: 9999 }}
          className="max-w-[240px] bg-neutral-900 text-white p-3 rounded-xl text-xs leading-relaxed shadow-xl animate-fade-in"
        >
          <div className="font-bold mb-1 text-accent-light">
            {getBadgeKoreanName(badge.name)}
          </div>
          {badge.description}
          <FloatingArrow
            ref={setArrowRef}
            context={context}
            className="fill-neutral-900"
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

  // 접근성 (포커스 & 스크롤락 & ESC 닫기)
  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKey);
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = original;
    };
  }, [isOpen, closeModal]);

  // 획득 뱃지 Set (빠른 조회를 위해)
  const earnedSet = useMemo(
    () => new Set(userBadges.map((b) => b.id)),
    [userBadges]
  );

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
          "h-[80vh] rounded-t-2xl sm:rounded-2xl animate-slide-up sm:animate-fade-in",
          "border-t sm:border border-border"
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface shrink-0">
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

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {badges.map((badge) => (
              <BadgeItem
                key={badge.id}
                badge={badge}
                isEarned={earnedSet.has(badge.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
