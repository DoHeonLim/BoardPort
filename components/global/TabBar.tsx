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
 * 2026.03.06  임도헌   Modified  최상위 탭 경로에서만 노출되도록 정리하고 데스크톱 중앙 하단 정렬을 보강
 * 2026.03.11  임도헌   Modified  제품/게시글/스트림 헤더 톤과 맞추기 위해 모바일 탭바의 글래스모피즘을 제거하고 평면형으로 정리
 * 2026.03.12  임도헌   Modified  최상위 탭 경로 노출 규칙과 flat 탭바 구조 명확화
 * 2026.03.22  임도헌   Modified  타 유저 프로필/채널 페이지에서도 탭바가 다시 노출되도록 규칙을 복원하고 profile 탭 활성 기준을 보강
 * 2026.03.25  임도헌   Modified  스크롤바가 있는 화면에서도 탭바가 래퍼와 어긋나지 않도록 중앙 정렬 방식을 inset-x-0/mx-auto로 조정
 * 2026.03.25  임도헌   Modified  탭바 셸을 내부 래퍼로 분리해 브라우저/스크롤바 환경에서도 중앙 정렬 안정성을 높임
 * 2026.03.25  임도헌   Modified  AppWrapper 실제 폭을 측정해 fixed 탭바가 셸과 정확히 정렬되도록 보정
 * 2026.03.26  임도헌   Modified  하단 경계에서 본문이 비쳐 보이지 않도록 fixed 래퍼 배경과 overflow를 보강
 * 2026.03.26  임도헌   Modified  하단 1px 서브픽셀 틈으로 콘텐츠가 비쳐 보이는 현상을 막기 위해 탭바를 미세하게 아래로 덮음
 * 2026.03.28  임도헌   Modified  AppWrapper 폭 측정 전 초기 렌더에서도 탭바가 왼쪽으로 압축되지 않도록 전체 폭 fallback을 추가
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

/**
 * 하단 글로벌 탭바
 *
 * [기능]
 * - 최상위 탭 경로 및 타 유저 프로필/채널 페이지에서 노출
 * - 현재 경로 기준 active 상태 표시
 * - 모바일 하단 고정 내비게이션 제공
 */
export default function TabBar() {
  const pathname = usePathname();
  const [shellBounds, setShellBounds] = useState<{
    left: number;
    width: number;
  } | null>(null);

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

  // 타 유저 프로필 메인/채널은 탭 탐색 문맥 안에 있으므로 탭바를 유지
  const isPublicProfileRoute = /^\/profile\/[^/]+(?:\/channel)?$/.test(
    pathname
  );
  const isMainTab = tabs.some((tab) => tab.href === pathname);
  const shouldShowTabBar = isMainTab || isPublicProfileRoute;

  useEffect(() => {
    const syncShellBounds = () => {
      const appWrapper = document.getElementById("app-wrapper");
      if (!appWrapper) return;

      const rect = appWrapper.getBoundingClientRect();
      setShellBounds({
        left: rect.left,
        width: rect.width,
      });
    };

    syncShellBounds();
    window.addEventListener("resize", syncShellBounds);

    const appWrapper = document.getElementById("app-wrapper");
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && appWrapper
        ? new ResizeObserver(syncShellBounds)
        : null;

    if (resizeObserver && appWrapper) {
      resizeObserver.observe(appWrapper);
    }

    return () => {
      window.removeEventListener("resize", syncShellBounds);
      resizeObserver?.disconnect();
    };
  }, [pathname]);

  if (!shouldShowTabBar) return null;

  return (
    <nav
      aria-label="글로벌 내비게이션"
      style={
        shellBounds
          ? {
              left: `${shellBounds.left}px`,
              width: `${shellBounds.width}px`,
            }
          : undefined
      }
      className={cn(
        // [위치] AppWrapper 실제 셸 폭에 맞춘 하단 고정
        "fixed -bottom-px z-40",
        !shellBounds && "inset-x-0 w-full",
        "pointer-events-none", // 내부 셸만 인터랙션
        "overflow-hidden bg-background dark:bg-background-dark",
        "transform-gpu translate-z-0", // Safari 렌더링 고정용 가속 추가
        "transition-transform duration-300"
      )}
    >
      <div
        className={cn(
          "pointer-events-auto w-full max-w-mobile",
          "bg-background border-t border-border-subtle shadow-[0_-6px_18px_rgba(2,6,23,0.08)] dark:shadow-[0_-10px_24px_rgba(2,6,23,0.32)]",
          "pb-[env(safe-area-inset-bottom)]"
        )}
      >
        <div className="grid grid-cols-5 h-[60px] items-center">
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/profile"
                ? pathname === "/profile" || isPublicProfileRoute
                : pathname === tab.href;
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
      </div>
    </nav>
  );
}
