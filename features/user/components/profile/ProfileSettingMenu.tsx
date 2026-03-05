/**
 * File Name : features/user/components/profile/ProfileSettingMenu.tsx
 * Description : 프로필 설정 드롭다운 메뉴(프로필 수정 / 비밀 항해 코드 수정 / 이메일 인증)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.12  임도헌   Created   상단 우측 드롭다운 신설
 * 2025.11.12  임도헌   Modified  항목 간 구분선/포커스/키보드 내비게이션 보강
 * 2026.01.10  임도헌   Modified  버튼  p-2.5 제거 -> size-10 (40px) 고정, flex 중앙 정렬
 * 2026.01.14  임도헌   Modified  다크모드 배경색 및 테두리 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/profile -> features/user/components/profile
 * 2026.01.29  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.07  임도헌   Modified  관리자 계정일 경우 '관리자 콘솔' 바로가기 추가 (isAdmin prop)
 * 2026.02.23  임도헌   Modified  회원 탈퇴 버튼 추가
 * 2026.02.26  임도헌   Modified  다크모드 가시성 개선
 * 2026.03.01  임도헌   Modified  window.dispatchEvent 제거 및 Zustand(useModalStore) 연동
 * 2026.03.03  임도헌   Modified  로컬 핸들러 잔재 제거 및 openModal 인자 매핑 수정
 * 2026.03.05  임도헌   Modified   주석 최신화
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Cog6ToothIcon,
  ComputerDesktopIcon,
  UserMinusIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { useModalStore } from "@/components/global/providers/ModalStoreProvider";

type Props = {
  emailVerified?: boolean;
  hasEmail?: boolean;
  isAdmin?: boolean;
};

/**
 * 프로필 설정 드롭다운 메뉴 컴포넌트
 *
 * [상호작용 및 상태 제어 로직]
 * - `useModalStore` Zustand 훅을 호출하여 비밀번호 변경, 이메일 인증, 회원 탈퇴 등의 상태 제어 이벤트 발행
 * - 관리자(`isAdmin`) 여부에 따른 '관리자 콘솔' 항목 조건부 렌더링
 * - 방향키(ArrowDown/Up) 및 Home/End 키보드 이벤트를 지원하는 순환 네비게이션(Accessibility) 적용
 */
export default function ProfileSettingMenu({
  emailVerified,
  hasEmail,
  isAdmin,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Zustand 스토어 액션 호출 (명시적 상태 변경)
  const openModal = useModalStore((state) => state.openModal);

  // 1. 바깥 클릭 및 ESC 닫기
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

  // 2. 키보드 네비게이션 (Accessibility)
  useEffect(() => {
    if (!open || !ref.current) return;
    const menu = ref.current.querySelector<HTMLDivElement>('[role="menu"]');
    if (!menu) return;

    // 포커스 가능한 메뉴 아이템 수집
    const focusables = Array.from(
      menu.querySelectorAll<HTMLElement>(
        '[data-menuitem="true"]:not([aria-disabled="true"])'
      )
    );

    if (focusables.length === 0) return;

    const onKey = (e: KeyboardEvent) => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
      e.preventDefault();

      const active = document.activeElement as HTMLElement | null;
      let idx = focusables.findIndex((el) => el === active);

      // 순환 네비게이션 로직
      if (e.key === "ArrowDown")
        idx = (idx + 1 + focusables.length) % focusables.length;
      if (e.key === "ArrowUp")
        idx = (idx - 1 + focusables.length) % focusables.length;
      if (e.key === "Home") idx = 0;
      if (e.key === "End") idx = focusables.length - 1;

      focusables[idx]?.focus();
    };

    menu.addEventListener("keydown", onKey as unknown as EventListener);
    focusables[0]?.focus(); // 메뉴 열리면 첫 항목 포커스

    return () =>
      menu.removeEventListener("keydown", onKey as unknown as EventListener);
  }, [open]);

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
          "bg-surface border border-border text-muted hover:text-primary hover:bg-surface-dim",
          isAdmin && "border-brand/30 text-brand dark:text-brand-light"
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
          {/* 관리자 콘솔 바로가기 */}
          {isAdmin && (
            <>
              <Link
                href="/admin"
                role="menuitem"
                data-menuitem="true"
                className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-brand dark:text-brand-light bg-brand/5 hover:bg-brand/10 dark:bg-brand-light/10 dark:hover:bg-brand-light/20 transition-colors"
                onClick={() => setOpen(false)}
              >
                <ComputerDesktopIcon className="size-4" />
                관리자 콘솔
              </Link>
              <div className="h-px bg-border" role="separator" />
            </>
          )}

          {/* 항목 1: 프로필 수정 */}
          <Link
            href="/profile/edit"
            role="menuitem"
            data-menuitem="true"
            className="block px-4 py-3 text-sm text-primary hover:bg-surface-dim transition-colors"
            onClick={() => setOpen(false)}
          >
            프로필 수정
          </Link>

          <div className="h-px bg-border" role="separator" />

          {/* 항목 2: 비밀번호 변경 */}
          <button
            role="menuitem"
            data-menuitem="true"
            onClick={() => {
              setOpen(false);
              openModal("password"); // Zustand 액션으로 교체
            }}
            className="w-full text-left px-4 py-3 text-sm text-primary hover:bg-surface-dim transition-colors"
          >
            비밀 항해 코드 변경
          </button>

          <div role="separator" className="h-px bg-border" />

          {/* 항목 3: 이메일 인증 (상태에 따라 다르게 표시) */}
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
              data-menuitem="true"
              onClick={() => {
                setOpen(false);
                openModal("email"); // Zustand 액션으로 교체
              }}
              className="w-full text-left px-4 py-3 text-sm text-primary hover:bg-surface-dim transition-colors"
            >
              이메일 인증하기
            </button>
          ) : (
            <Link
              href="/profile/edit"
              role="menuitem"
              data-menuitem="true"
              className="block px-4 py-3 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              onClick={() => setOpen(false)}
            >
              이메일 설정 필요
            </Link>
          )}

          <div role="separator" className="h-px bg-border" />

          {/* 항목 4: 차단된 유저 관리 */}
          <button
            role="menuitem"
            data-menuitem="true"
            onClick={() => {
              setOpen(false);
              openModal("block"); // Zustand 액션으로 교체
            }}
            className="w-full text-left px-4 py-3 text-sm text-primary hover:bg-surface-dim transition-colors"
          >
            차단한 선원 관리
          </button>

          <div role="separator" className="h-px bg-border" />

          {/* 항목 5: 회원 탈퇴 */}
          <button
            role="menuitem"
            data-menuitem="true"
            onClick={() => {
              setOpen(false);
              openModal("withdraw"); // Zustand 액션으로 교체
            }}
            className="w-full text-left px-4 py-3 text-sm font-medium text-danger hover:bg-danger/5 transition-colors flex items-center gap-2"
          >
            <UserMinusIcon className="size-4" />
            회원 탈퇴
          </button>
        </div>
      )}
    </div>
  );
}
