/**
 * File Name : features/user/components/admin/AdminNavLink.tsx
 * Description : 관리자 사이드바 전용 클라이언트 링크 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   usePathname을 활용한 활성화 스타일 적용
 * 2026.03.30  임도헌   Modified  관리자 모바일/데스크톱 공통 네비게이션에서 같은 활성 상태 문법을 재사용하도록 정리
 * 2026.04.18  임도헌   Modified  관리자 셸 링크 프리패치를 비활성화해 과도한 백그라운드 라우트 요청을 줄임
 * 2026.04.26  임도헌   Modified  활성 링크의 다크모드 색조를 primary CTA 톤과 맞춰 정리
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
 * 1. 아이콘과 라벨을 포함한 관리자 네비게이션 링크를 렌더링
 * 2. 현재 경로(usePathname)와 일치할 경우 활성화 스타일 적용
 * 3. 데스크톱 사이드바와 모바일 드로어에서 같은 활성 문법을 재사용
 */
export default function AdminNavLink({ href, icon, label }: AdminNavLinkProps) {
  const pathname = usePathname();
  // 현재 exact match만 활성 상태로 처리, 하위 경로 강조 필요 시 startsWith 규칙 확장 가능
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        "focus-ring-soft flex items-center gap-3 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors group",
        isActive
          ? "bg-brand text-white shadow-md dark:bg-brand dark:text-white"
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
