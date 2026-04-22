/**
 * File Name : features/user/components/admin/MobileSidebar.tsx
 * Description : 모바일용 관리자 사이드바 (Sheet/Drawer)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   모바일 반응형 사이드바 구현
 * 2026.03.23  임도헌   Modified  모바일 관리자 드로어 셸과 구분선을 구조선 기준으로 border-border-subtle에 맞춰 정리
 * 2026.03.30  임도헌   Modified  현재 섹션 이동 후 자동 닫힘과 데스크톱과 동일한 정보 구조를 유지하도록 정리
 * 2026.04.10  임도헌   Modified  모바일 관리자 드로어의 섹션 라벨 크기를 공통 타이포 스케일로 정리
 * 2026.04.18  임도헌   Modified  닫기 아이콘 버튼에 접근 가능한 이름과 button 타입을 추가
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
 * 1. 햄버거 버튼 클릭 시 사이드바를 슬라이드 드로어 형태로 노출
 * 2. 배경 클릭 또는 페이지 이동 시 자동으로 닫힘
 * 3. 데스크톱 사이드바와 동일한 관리자 정보 구조를 모바일에서도 유지
 */
export default function MobileSidebar({
  user,
}: {
  user: { avatar?: string | null; username: string };
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // 포털 렌더링 준비
  // 드로어를 body 포털로 올리기 전에 hydration mismatch를 피하기 위한 mounted 상태
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // 드로어 및 백드롭 레이어
  // 본문보다 높은 레이어에서 열리고 배경 클릭만으로도 닫히는 모바일 네비게이션 구조
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
          "fixed inset-y-0 left-0 w-72 bg-surface border-r border-border-subtle z-[101] flex flex-col transition-transform duration-300 ease-out shadow-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-border-subtle bg-surface-dim/30">
          <UserAvatar
            avatar={user.avatar}
            username={user.username}
            disabled={true}
            compact={true}
          />
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="focus-ring-soft p-2 -mr-2 rounded-lg text-muted hover:text-primary transition-colors"
            aria-label="관리자 메뉴 닫기"
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
          <div className="text-xs font-bold text-muted uppercase tracking-widest mt-8 mb-2 px-4">
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

        <div className="p-4 border-t border-border-subtle bg-surface-dim/20">
          <Link
            href="/"
            prefetch={false}
            className="focus-ring-soft flex items-center gap-3 px-4 py-3 text-sm font-bold text-muted hover:text-primary hover:bg-surface-dim rounded-xl transition-colors"
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
        type="button"
        onClick={() => setIsOpen(true)}
        className="focus-ring-soft md:hidden p-2 -ml-2 text-muted hover:bg-surface-dim rounded-lg transition-colors"
        aria-label="관리자 메뉴 열기"
      >
        <Bars3Icon className="size-6" />
      </button>

      {/* Portal: 실제 사이드바 레이어만 body로 전송 */}
      {mounted && createPortal(drawerContent, document.body)}
    </>
  );
}
