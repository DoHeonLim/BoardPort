/**
 * File Name : app/(app)/admin/layout.tsx
 * Description : 관리자 페이지 전용 레이아웃 (Desktop-First, Full Width)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   관리자 권한 가드 및 Full-Width 사이드바 레이아웃 적용
 * 2026.02.24  임도헌   Modified  로고 추가
 * 2026.03.23  임도헌   Modified  관리자 셸 구조선 기준으로 사이드바/헤더 보더를 border-border-subtle에 맞춰 정리
 * 2026.03.29  임도헌   Modified  모바일 가독성을 위해 sticky 헤더의 blur를 제거하고 불투명 표면으로 정리
 * 2026.03.30  임도헌   Modified  현재 섹션 헤더와 모바일 드로어 네비게이션을 보강해 운영 문맥을 쉽게 파악하도록 정리
 * 2026.03.30  임도헌   Modified  세션·DB 직접 조회를 제거하고 관리자 인증 서비스를 재사용하도록 구조 정리
 * 2026.04.10  임도헌   Modified  관리자 셸 라벨과 로고 weight를 Pretendard subset 3-weight 정책에 맞춰 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/admin/layout.tsx 에서 app/(app)/admin/layout.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.28  임도헌   Modified  보드게임 카탈로그 관리 진입점 추가
*/

import { redirect } from "next/navigation";
import Link from "next/link";
import { verifyAdminAccess } from "@/features/auth/service/authSession";
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  HomeIcon,
  ShoppingBagIcon,
  DocumentMagnifyingGlassIcon,
  VideoCameraIcon,
  ClipboardDocumentListIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import Logo from "@/components/ui/Logo";
import AdminNavLink from "@/features/user/components/admin/AdminNavLink";
import MobileSidebar from "@/features/user/components/admin/MobileSidebar";
import AdminSectionHeading from "@/features/user/components/admin/AdminSectionHeading";
import ThemeToggle from "@/components/global/ThemeToggle";
import UserAvatar from "@/components/global/UserAvatar";

/**
 * 관리자 전용 앱 셸 레이아웃
 *
 * - 관리자 인증 서비스 기반 권한 검증
 * - 비관리자 접근 차단 및 홈 리다이렉트
 * - 데스크톱 사이드바와 모바일 드로어 공존 구조
 * - sticky 헤더 기반 현재 운영 섹션 문맥 유지
 *
 * @param {{ children: React.ReactNode }} props - 관리자 페이지 콘텐츠
 * @returns {Promise<JSX.Element>} 관리자 셸 레이아웃
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await verifyAdminAccess();
  if (!auth.success || !auth.adminUser) {
    redirect("/");
  }

  const user = auth.adminUser;

  return (
    <div className="flex min-h-screen w-full bg-background transition-colors">
      {/* 데스크톱 전용 사이드바 */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border-subtle bg-surface fixed inset-y-0 left-0 z-50">
        <div className="h-16 flex items-center px-6 border-b border-border-subtle gap-3">
          <Logo variant="symbol" size={32} />
          <Link
            href="/admin"
            prefetch={false}
            className="focus-ring-soft rounded-lg font-bold text-xl text-brand tracking-tighter dark:text-brand-light"
          >
            BoardPort{" "}
            <span className="text-muted font-bold text-xs uppercase tracking-normal">
              Admin
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
          <div className="text-xs font-bold text-muted uppercase tracking-widest mb-3 px-4">
            Overview
          </div>
          <AdminNavLink
            href="/admin"
            icon={<ChartBarIcon />}
            label="대시보드"
          />
          <div className="text-xs font-bold text-muted uppercase tracking-widest mt-8 mb-3 px-4">
            Management
          </div>
          <AdminNavLink
            href="/admin/reports"
            icon={<ExclamationTriangleIcon />}
            label="신고 관리"
          />
          <AdminNavLink
            href="/admin/users"
            icon={<UsersIcon />}
            label="유저 관리"
          />
          <AdminNavLink
            href="/admin/products"
            icon={<ShoppingBagIcon />}
            label="상품 관리"
          />
          <AdminNavLink
            href="/admin/posts"
            icon={<DocumentMagnifyingGlassIcon />}
            label="게시글 관리"
          />
          <AdminNavLink
            href="/admin/streams"
            icon={<VideoCameraIcon />}
            label="방송 관리"
          />
          <AdminNavLink
            href="/admin/boardgames"
            icon={<Squares2X2Icon />}
            label="도감 관리"
          />
          <AdminNavLink
            href="/admin/logs"
            icon={<ClipboardDocumentListIcon />}
            label="감사 로그"
          />
        </nav>

        <div className="p-4 border-t border-border-subtle bg-surface-dim/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center px-4 min-w-0">
              <UserAvatar
                avatar={user.avatar}
                username={user.username}
                disabled={true}
                compact={true}
              />
            </div>
          </div>

          <Link
            href="/"
            prefetch={false}
            className="focus-ring-soft flex items-center gap-2 w-full px-4 py-2.5 text-sm font-bold text-muted hover:text-primary hover:bg-surface-dim rounded-xl transition-colors"
          >
            <HomeIcon className="size-4" />
            서비스 홈
          </Link>
        </div>
      </aside>

      {/* 사이드바 폭을 고려한 메인 셸 */}
      <main className="flex-1 md:ml-64 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border-subtle bg-surface px-4 md:px-8">
          <div className="flex items-center gap-4">
            <MobileSidebar user={user} />
            <AdminSectionHeading />
          </div>
          <ThemeToggle />
        </header>

        <div className="p-4 md:p-8 max-w-[1600px] w-full mx-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}

