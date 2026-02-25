/**
 * File Name : features/user/components/admin/MobileSidebar.tsx
 * Description : 모바일용 관리자 사이드바 (Sheet/Drawer)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   모바일 반응형 사이드바 구현
 */
"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  HomeIcon,
  ShoppingBagIcon,
  DocumentMagnifyingGlassIcon,
  VideoCameraIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import UserAvatar from "@/components/global/UserAvatar";
import AdminNavLink from "@/features/user/components/admin/AdminNavLink";
import { cn } from "@/lib/utils";

/**
 * 모바일 환경 관리자 네비게이션 드로어
 *
 * [기능]
 * 1. 햄버거 버튼 클릭 시 사이드바를 슬라이드(Slide-in) 형태로 노출함
 * 2. 배경 클릭 또는 페이지 이동 시 자동으로 닫힘
 * 3. 데스크톱 사이드바와 동일한 네비게이션 구조를 제공함
 */
export default function MobileSidebar({
  user,
}: {
  user: { avatar?: string | null; username: string };
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // SSR Hydration 이슈 방지 및 클라이언트 사이드 포털 준비
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // 드로어 및 백드롭 UI
  const drawerContent = (
    <>
      {/* Backdrop: 전체 화면을 덮어 배경 클릭 시 닫히도록 함 */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Side Drawer Body */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 w-72 bg-surface border-r border-border z-[101] flex flex-col transition-transform duration-300 ease-out shadow-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-border bg-surface-dim/30">
          <UserAvatar
            avatar={user.avatar}
            username={user.username}
            disabled={true}
            compact={true}
          />
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 -mr-2 text-muted hover:text-primary transition-colors"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
          <AdminNavLink
            href="/admin"
            icon={<ChartBarIcon />}
            label="대시보드"
          />
          <div className="text-[10px] font-bold text-muted uppercase tracking-widest mt-8 mb-2 px-4">
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
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-muted hover:text-primary hover:bg-surface-dim rounded-xl transition-all"
          >
            <HomeIcon className="size-5" />
            서비스 홈으로
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Trigger Button: 이 버튼은 원래 위치(Header)에 유지됨 */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 -ml-2 text-muted hover:bg-surface-dim rounded-lg transition-colors"
        aria-label="관리자 메뉴 열기"
      >
        <Bars3Icon className="size-6" />
      </button>

      {/* Portal: 실제 사이드바 레이어만 body로 전송 */}
      {mounted && createPortal(drawerContent, document.body)}
    </>
  );
}
