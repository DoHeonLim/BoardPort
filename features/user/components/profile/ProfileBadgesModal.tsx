/**
 * File Name : features/user/components/profile/ProfileBadgesModal.tsx
 * Description : 뱃지 모달
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
 */

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { getBadgeKoreanName } from "@/lib/utils";
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
  type Placement,
} from "@floating-ui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

type Badge = {
  id: number;
  name: string;
  icon: string;
  description: string;
};

interface ProfileBadgesModalProps {
  isOpen: boolean;
  closeModal: () => void;
  badges: Badge[];
  userBadges: Badge[];
}

function BadgeItem({ badge, isEarned }: { badge: Badge; isEarned: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [arrowRef, setArrowRef] = useState<SVGSVGElement | null>(null);

  // Floating UI 설정
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen, // 툴팁 열림/닫힘 상태
    onOpenChange: setIsOpen, // 상태 변경 핸들러
    placement: "bottom" as Placement, // 툴팁 위치 (아래쪽)
    middleware: [
      offset(10), // 타겟으로부터 10px 거리 유지
      flip({ padding: 10 }), // 공간 부족시 반대로 뒤집기
      shift({ padding: 10 }), // 화면 벗어날 경우 이동
      arrow({ element: arrowRef }), // 화살표 위치 조정
    ],
  });
  // 인터랙션 설정
  const hover = useHover(context, {
    move: false, // 마우스 이동 시 반응하지 않음
    delay: { open: 100, close: 200 },
    restMs: 40,
  });
  const dismiss = useDismiss(context);
  const role = useRole(context, {
    role: "tooltip", // 명시적으로 tooltip 역할 지정
  });
  // 인터랙션 props 결합
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    dismiss,
    role,
  ]);

  return (
    <>
      {/* 뱃지 아이템 */}
      <div
        ref={refs.setReference} // 툴팁의 기준점 설정
        {...getReferenceProps()} // 인터랙션 props 적용
        className={cn(
          "flex flex-col items-center justify-center p-3 rounded-xl border transition-all aspect-square",
          isEarned
            ? "bg-brand/5 border-brand/20 dark:bg-brand-light/10 dark:border-brand-light/20"
            : "bg-surface-dim/30 border-border opacity-50 grayscale"
        )}
      >
        {/* 뱃지 이미지 */}
        <div className="relative w-12 h-12 mb-2">
          <Image
            src={`${badge.icon}/public`}
            alt={badge.name}
            fill
            className="object-contain"
          />
        </div>
        {/* 뱃지 이름 */}
        <span
          className={cn(
            "text-[11px] text-center font-medium leading-tight",
            isEarned ? "text-primary" : "text-muted"
          )}
        >
          {getBadgeKoreanName(badge.name)}
        </span>
      </div>

      {/* 툴팁 (열려있을 때만 표시) */}
      {isOpen && (
        <div
          ref={refs.setFloating} // 툴팁 요소 참조
          {...getFloatingProps()} // 툴팁 인터랙션 props
          style={{ ...floatingStyles, zIndex: 9999 }} // 위치 스타일
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

export default function ProfileBadgesModal({
  isOpen,
  closeModal,
  badges,
  userBadges,
}: ProfileBadgesModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

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
