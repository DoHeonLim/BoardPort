/**
 * File Name : components/theme/ThemeToggle
 * Description : 테마 변경 버튼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2024.12.13  임도헌   Created
 * 2024.12.13  임도헌   Modified   테마 변경 버튼 추가
 * 2025.10.05  임도헌   Modified   접근성(aria-pressed/title) 및 마운트 처리 보강
 * 2026.01.10  임도헌   Modified   버튼  p-2.5 제거 -> size-10 (40px) 고정, flex 중앙 정렬
 * 2026.01.15  임도헌   Modified  [UI] 헤더 버튼 스타일(bg-surface, border)로 통일
 * 2026.01.18  임도헌   Moved     components/theme -> components/global
 */

"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="size-10" />; // Layout shift 방지용 placeholder

  const isDark = (resolvedTheme ?? theme) === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "라이트 모드로 변경" : "다크 모드로 변경"}
      className="flex items-center justify-center size-10 rounded-xl border border-border bg-surface text-muted hover:text-primary hover:bg-surface-dim transition-colors shadow-sm"
    >
      {isDark ? (
        <SunIcon className="size-5" />
      ) : (
        <MoonIcon className="size-5" />
      )}
    </button>
  );
}
