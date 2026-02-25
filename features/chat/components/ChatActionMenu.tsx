/**
 * File Name : features/chat/components/ChatActionMenu.tsx
 * Description : 채팅 입력창 좌측 '+' 버튼 메뉴 (사진/약속)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.19  임도헌   Created   사진/약속 선택 메뉴 구현
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
 * @param onSelectPhoto - 사진 선택 핸들러 실행
 * @param onSelectAppointment - 약속 잡기 모달 오픈 핸들러 실행
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
          "shrink-0 size-10 rounded-full flex items-center justify-center transition-colors",
          "bg-surface-dim text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5",
          isOpen && "bg-black/10 dark:bg-white/10 text-primary"
        )}
        aria-label="채팅 메뉴 열기"
        aria-expanded={isOpen}
      >
        <PlusIcon
          className="size-6 transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(45deg)" : "none" }}
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-surface rounded-xl shadow-xl border border-border overflow-hidden animate-fade-in z-50">
          <button
            onClick={() => {
              setIsOpen(false);
              onSelectPhoto();
            }}
            className="w-full px-4 py-3 text-left text-sm font-medium text-primary hover:bg-surface-dim flex items-center gap-3 transition-colors"
          >
            <div className="p-1.5 bg-brand/10 rounded-lg text-brand">
              <PhotoIcon className="size-5" />
            </div>
            사진 보내기
          </button>
          <div className="h-px bg-border" />
          <button
            onClick={() => {
              setIsOpen(false);
              onSelectAppointment();
            }}
            className="w-full px-4 py-3 text-left text-sm font-medium text-primary hover:bg-surface-dim flex items-center gap-3 transition-colors"
          >
            <div className="p-1.5 bg-green-500/10 rounded-lg text-green-600">
              <CalendarDaysIcon className="size-5" />
            </div>
            약속 잡기
          </button>
        </div>
      )}
    </div>
  );
}
