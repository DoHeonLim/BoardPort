/**
 * File Name : components/global/TabBar.tsx
 * Description : 탭 바 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.14  임도헌   Created
 * 2024.10.14  임도헌   Modified  tab-bar 컴포넌트 추가
 * 2024.10.17  임도헌   Modified  tab-bar 크기 max-w-screen-sm로 변경
 * 2024.11.25  임도헌   Modified  tab-bar hover 스타일 추가
 * 2024.12.15  임도헌   Modified  보드포트 컨셉으로 변경
 * 2024.12.15  임도헌   Modified  다크모드/라이트모드 적용
 * 2025.04.29  임도헌   Modified  반응형 디자인 적용
 * 2025.12.12  임도헌   Modified  sm에서 max-w 고정 유지(2중 래퍼), streams 텍스트 활성 버그 수정, Spacer 제거 전제 정리
 * 2026.01.11  임도헌   Modified  [Rule 4.1] 시맨틱 토큰 & 레이아웃 고정 적용
 * 2026.01.16  임도헌   Moved     components/common -> components/global
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NewspaperIcon as SolidNewspaperIcon,
  HomeIcon as SolidHomeIcon,
  ChatBubbleOvalLeftEllipsisIcon as SolidChatIcon,
  VideoCameraIcon as SolidVideoCameraIcon,
  UserIcon as SolidUserIcon,
} from "@heroicons/react/24/solid";
import {
  NewspaperIcon as OutlineNewspaperIcon,
  HomeIcon as OutlineHomeIcon,
  ChatBubbleOvalLeftEllipsisIcon as OutlineChatIcon,
  VideoCameraIcon as OutlineVideoCameraIcon,
  UserIcon as OutlineUserIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

export default function TabBar() {
  const pathname = usePathname();

  const tabs = [
    {
      href: "/products",
      label: "항구",
      solidIcon: SolidHomeIcon,
      outlineIcon: OutlineHomeIcon,
    },
    {
      href: "/posts",
      label: "항해일지",
      solidIcon: SolidNewspaperIcon,
      outlineIcon: OutlineNewspaperIcon,
    },
    {
      href: "/chat",
      label: "신호",
      solidIcon: SolidChatIcon,
      outlineIcon: OutlineChatIcon,
    },
    {
      href: "/streams",
      label: "등대방송",
      solidIcon: SolidVideoCameraIcon,
      outlineIcon: OutlineVideoCameraIcon,
    },
    {
      href: "/profile",
      label: "선원증",
      solidIcon: SolidUserIcon,
      outlineIcon: OutlineUserIcon,
    },
  ];

  // [Rule 4.1.2] 최상위 루트 경로가 아니면 TabBar 숨김
  // 1. pathname이 탭 목록에 있는 경로 중 하나와 정확히 일치하는지 확인
  const isMainTab = tabs.some((tab) => tab.href === pathname);

  // 2. 예외 처리: 프로필 경로('/profile')로 시작하는 경우 (서브 페이지 포함)
  const isProfileSection = pathname.startsWith("/profile");

  // 메인 탭 경로와 정확히 일치하지 않고, 프로필 섹션도 아니라면 탭바를 숨김
  if (!isMainTab && !isProfileSection) return null;

  return (
    <nav
      aria-label="글로벌 내비게이션"
      className={cn(
        // [위치] 하단 고정, 하지만 max-w-mobile 너비로 제한하여 중앙 정렬 유지
        "fixed bottom-0 z-40 w-full max-w-mobile",
        // [스타일] 배경 블러 처리 및 상단 테두리
        "bg-surface/90 backdrop-blur-md border-t border-border",
        "pb-[env(safe-area-inset-bottom)]", // 아이폰 홈 바 안전 영역 확보
        "transform-gpu translate-z-0", // Safari 렌더링 고정용 가속 추가
        "transition-transform duration-300"
      )}
    >
      <div className="grid grid-cols-5 h-[60px] items-center">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = isActive ? tab.solidIcon : tab.outlineIcon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                // [상호작용] 터치 영역 44px 이상 보장 (그리드 높이로 자동 처리)
                "flex flex-col items-center justify-center gap-1 h-full w-full",
                "active:scale-95 transition-transform", // 클릭 시 살짝 눌리는 효과
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light" // 키보드 접근성
              )}
            >
              <Icon
                className={cn(
                  "w-6 h-6 transition-colors duration-200",
                  isActive ? "text-brand dark:text-brand-light" : "text-muted"
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "text-xs sm:text-sm font-medium transition-colors duration-200",
                  isActive ? "text-brand dark:text-brand-light" : "text-muted"
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
