/**
 * File Name : components/profile/ProfileSettingMenu
 * Description : 프로필 설정 드롭다운(프로필 수정 / 비밀 항해 코드 수정 / 이메일 인증)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.12  임도헌   Created   상단 우측 드롭다운 신설
 * 2025.11.12  임도헌   Modified  항목 간 구분선/포커스/키보드 내비게이션 보강
 * 2026.01.10  임도헌   Modified  버튼  p-2.5 제거 -> size-10 (40px) 고정, flex 중앙 정렬
 * 2026.01.14  임도헌   Modified  [Fix] 다크모드 배경색 및 테두리 시맨틱 토큰 적용
 */

"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";

type Props = {
  emailVerified?: boolean;
  hasEmail?: boolean;
};

export default function ProfileSettingMenu({ emailVerified, hasEmail }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 바깥 클릭/ESC 닫기
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // 키보드 내비게이션(↑/↓/Home/End)
  useEffect(() => {
    if (!open || !ref.current) return;
    const menu = ref.current.querySelector<HTMLDivElement>('[role="menu"]');
    if (!menu) return;
    const focusables = Array.from(
      menu.querySelectorAll<HTMLElement>(
        '[data-menuitem="true"]:not([aria-disabled="true"])'
      )
    );

    if (focusables.length === 0) return; // 가드 추가

    const onKey = (e: KeyboardEvent) => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const active = document.activeElement as HTMLElement | null;
      let idx = focusables.findIndex((el) => el === active);
      if (e.key === "ArrowDown")
        idx = (idx + 1 + focusables.length) % focusables.length;
      if (e.key === "ArrowUp")
        idx = (idx - 1 + focusables.length) % focusables.length;
      if (e.key === "Home") idx = 0;
      if (e.key === "End") idx = focusables.length - 1;
      focusables[idx]?.focus();
    };

    menu.addEventListener("keydown", onKey as unknown as EventListener);
    focusables[0]?.focus();
    return () =>
      menu.removeEventListener("keydown", onKey as unknown as EventListener);
  }, [open]);

  // MyProfile에서 모달을 열도록 이벤트 발행
  const openPassword = () =>
    window.dispatchEvent(new CustomEvent("open-password-modal"));
  const openEmailVerify = () =>
    window.dispatchEvent(new CustomEvent("open-email-verification-modal"));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="설정"
        className={cn(
          "flex items-center justify-center size-10 rounded-xl transition-colors shadow-sm",
          "bg-surface border border-border text-muted hover:text-primary hover:bg-surface-dim"
        )}
      >
        <Cog6ToothIcon className="size-5" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="프로필 설정"
          className="absolute right-0 mt-2 w-48 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in bg-surface border border-border"
        >
          {/* 항목 1 */}
          <Link
            href="/profile/edit"
            role="menuitem"
            className="block px-4 py-3 text-sm text-primary hover:bg-surface-dim transition-colors"
            onClick={() => setOpen(false)}
          >
            프로필 수정
          </Link>

          <div className="h-px bg-border" role="separator" />

          {/* 항목 2 */}
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              openPassword();
            }}
            className="w-full text-left px-4 py-3 text-sm text-primary hover:bg-surface-dim transition-colors"
          >
            비밀 항해 코드 변경
          </button>

          <div role="separator" className="h-px bg-border" />

          {/* 항목 3 (이메일) */}
          {emailVerified ? (
            <div
              role="menuitem"
              className="px-4 py-3 text-xs text-muted bg-surface-dim/50 cursor-default"
            >
              이메일 인증됨
            </div>
          ) : hasEmail ? (
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                openEmailVerify();
              }}
              className="w-full text-left px-4 py-3 text-sm text-primary hover:bg-surface-dim transition-colors"
            >
              이메일 인증하기
            </button>
          ) : (
            <Link
              href="/profile/edit"
              role="menuitem"
              className="block px-4 py-3 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              onClick={() => setOpen(false)}
            >
              이메일 설정 필요
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
