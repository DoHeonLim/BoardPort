/**
 * File Name : features/chat/components/ChatActionMenu.tsx
 * Description : 채팅 입력창 좌측 '+' 버튼 메뉴 (사진/약속)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.19  임도헌   Created   사진/약속 선택 메뉴 구현
 * 2026.02.26  임도헌   Modified  다크모드 아이콘 가시성 개선 (brand-light)
 * 2026.03.12  임도헌   Modified  채팅 액션 메뉴 토글과 약속 아이콘 배경을 시맨틱 토큰 기준으로 정리
 * 2026.03.23  임도헌   Modified  채팅 액션 메뉴 셸과 내부 구분선을 구조선 기준으로 border-border-subtle에 맞춰 정리
 * 2026.03.27  임도헌   Modified  라이트/다크 공통 가시성을 위해 액션 메뉴 패널과 약속 잡기 아이콘 대비를 재정리
 * 2026.03.27  임도헌   Modified  채팅 액션 메뉴 보조 설명을 제거하고 단일 라인 액션 구조로 간결화
 * 2026.04.02  임도헌   Modified  액션 메뉴 컴포넌트 JSDoc 보강
 */

"use client";

import { useState, useRef, useEffect } from "react";
import {
  PlusIcon,
  PhotoIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface ChatActionMenuProps {
  onSelectPhoto: () => void;
  onSelectAppointment: () => void;
  disabled?: boolean;
}

/**
 * 채팅 입력바 좌측의 확장 메뉴 버튼
 * - '+' 아이콘을 클릭하면 '사진 보내기'와 '약속 잡기' 메뉴가 팝업
 * - 외부 클릭 시 자동으로 닫힘
 *
 * @param {ChatActionMenuProps} props - 사진/약속 액션과 비활성 상태를 담은 메뉴 props
 * @returns {JSX.Element} 채팅 입력바용 확장 액션 메뉴
 */
export default function ChatActionMenu({
  onSelectPhoto,
  onSelectAppointment,
  disabled,
}: ChatActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 감지 (메뉴 닫기)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full border border-transparent transition-colors",
          "bg-surface-dim text-muted hover:text-primary",
          isOpen && "border-border bg-surface text-primary shadow-sm"
        )}
        aria-label="채팅 메뉴 열기"
        aria-expanded={isOpen}
      >
        <PlusIcon
          className={cn(
            "size-6 transition-transform duration-200",
            isOpen && "text-brand dark:text-brand-light"
          )}
          style={{ transform: isOpen ? "rotate(45deg)" : "none" }}
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-44 overflow-hidden rounded-2xl border border-border bg-background p-2 shadow-2xl">
          <button
            onClick={() => {
              setIsOpen(false);
              onSelectPhoto();
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-primary transition-colors hover:bg-surface-dim"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-brand/10 text-brand dark:bg-brand-light/10 dark:text-brand-light">
              <PhotoIcon className="size-5" />
            </div>
            <span className="truncate">사진 보내기</span>
          </button>
          <div className="my-1 h-px bg-border-subtle" />
          <button
            onClick={() => {
              setIsOpen(false);
              onSelectAppointment();
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-primary transition-colors hover:bg-surface-dim"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-dim text-primary shadow-sm">
              <CalendarDaysIcon className="size-5" />
            </div>
            <span className="truncate">약속 잡기</span>
          </button>
        </div>
      )}
    </div>
  );
}
