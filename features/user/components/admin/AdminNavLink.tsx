/**
 * File Name : app/admin/AdminNavLink.tsx
 * Description : 관리자 사이드바 전용 클라이언트 링크 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   usePathname을 활용한 활성화 스타일 적용
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AdminNavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

/**
 * 관리자 사이드바용 링크 컴포넌트
 *
 * [기능]
 * 1. 아이콘과 라벨을 포함한 네비게이션 링크를 렌더링함
 * 2. 현재 경로(`usePathname`)와 일치할 경우 활성화(Active) 스타일을 적용함
 */
export default function AdminNavLink({ href, icon, label }: AdminNavLinkProps) {
  const pathname = usePathname();
  // 현재 경로가 해당 링크로 시작하는지 확인 (정확히 일치하거나 하위 경로인 경우)
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 text-sm font-bold rounded-xl transition-all group",
        isActive
          ? "bg-brand dark:bg-brand-light text-white dark:text-gray-900 shadow-md"
          : "text-muted hover:bg-surface-dim hover:text-primary"
      )}
    >
      <span
        className={cn(
          "size-5 transition-colors",
          isActive
            ? "text-current"
            : "text-muted group-hover:text-brand dark:group-hover:text-brand-light"
        )}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}
