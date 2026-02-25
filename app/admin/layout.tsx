/**
 * File Name : app/admin/layout.tsx
 * Description : 관리자 페이지 전용 레이아웃 (Desktop-First, Full Width)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   관리자 권한 가드 및 Full-Width 사이드바 레이아웃 적용
 * 2026.02.24  임도헌   Modified  로고 추가
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import getSession from "@/lib/session";
import db from "@/lib/db";
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  HomeIcon,
  ShoppingBagIcon,
  DocumentMagnifyingGlassIcon,
  VideoCameraIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import Logo from "@/components/ui/Logo";
import AdminNavLink from "@/features/user/components/admin/AdminNavLink";
import MobileSidebar from "@/features/user/components/admin/MobileSidebar";
import ThemeToggle from "@/components/global/ThemeToggle";
import UserAvatar from "@/components/global/UserAvatar";

/**
 * 관리자 레이아웃
 * 1. 세션 확인 및 DB 조회를 통한 관리자 권한(Role=ADMIN) 2중 검증 (SSOT)
 * 2. 권한 없을 시 홈으로 강제 리다이렉트
 * 3. 데스크톱 사이드바 및 모바일 드로어 네비게이션 제공
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. 세션 확인
  const session = await getSession();
  if (!session?.id) redirect("/login");

  // 2. 권한 확인 (DB SSOT)
  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { role: true, username: true, avatar: true },
  });

  // 3. 관리자가 아니면 홈으로 리다이렉트
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen w-full bg-background transition-colors">
      {/* [Desktop Sidebar] md 이상에서만 표시 */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-surface fixed inset-y-0 left-0 z-50">
        <div className="h-16 flex items-center px-6 border-b border-border gap-3">
          {/* 작은 심볼 로고 배치 */}
          <Logo variant="symbol" size={32} />
          <Link
            href="/admin"
            className="font-black text-xl text-brand dark:text-brand-light tracking-tighter"
          >
            BoardPort{" "}
            <span className="text-muted font-bold text-[10px] uppercase tracking-normal">
              Admin
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
          <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 px-4">
            Overview
          </div>
          <AdminNavLink
            href="/admin"
            icon={<ChartBarIcon />}
            label="대시보드"
          />
          <div className="text-[10px] font-bold text-muted uppercase tracking-widest mt-8 mb-3 px-4">
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
            href="/admin/logs"
            icon={<ClipboardDocumentListIcon />}
            label="감사 로그"
          />
        </nav>

        <div className="p-4 border-t border-border bg-surface-dim/20">
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
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-bold text-muted hover:text-primary hover:bg-surface-dim rounded-xl transition-all"
          >
            <HomeIcon className="size-4" />
            서비스 홈
          </Link>
        </div>
      </aside>

      {/* [Main Area] md 이상에서는 사이드바 너비만큼 왼쪽 마진 확보 */}
      <main className="flex-1 md:ml-64 min-w-0 flex flex-col">
        {/* Header: sticky 및 backdrop-blur 적용 */}
        <header className="h-16 bg-surface/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {/* MobileSidebar 컴포넌트 내부에서 Portal을 사용하여 드로어 렌더링 */}
            <MobileSidebar user={user} />
            <h2 className="font-bold text-primary">관리자 콘솔</h2>
          </div>
          <ThemeToggle />
        </header>

        {/* Content Section */}
        <div className="p-4 md:p-8 max-w-[1600px] w-full mx-auto animate-fade-in flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
