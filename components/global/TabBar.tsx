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
 * 2026.05.12  임도헌   Modified  신호 탭에 미읽음 채팅 뱃지와 rooms_refresh 기반 실시간 갱신 추가
 * 2026.05.17  임도헌   Modified  rooms_refresh 구독을 ChatRoomsRealtimeBridge로 이동해 탭바는 query 표시만 담당
 * 2026.05.18  임도헌   Modified  서버 초기 미읽음 수를 query cache에 명시 동기화해 탭 전환 후 뱃지 잔상 보정
 * 2026.05.18  임도헌   Modified  미읽음 수 클라이언트 재검증을 Server Action 대신 전용 API 조회로 전환
 * 2026.06.07  임도헌   Modified  오래된 서버 초기값이 클라이언트 미읽음 차감을 되돌리지 않도록 보정
 * 2026.06.21  임도헌   Modified  하단 신호 탭 미읽음 뱃지가 탭바 상단에서 잘려 보이지 않도록 위치 조정
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { queryKeys } from "@/lib/queryKeys";

interface TabBarProps {
  userId?: number;
  initialUnreadChatCount?: number;
}

/**
 * TabBar 채팅 뱃지용 전체 미읽음 수 조회
 *
 * Client Component 초기 렌더에서 Server Action을 직접 queryFn으로 호출하면
 * App Router fetch waterfall 오류가 발생할 수 있어 전용 Route Handler를 사용합니다.
 */
async function fetchUnreadChatMessageCount() {
  const response = await fetch("/api/chats/unread-count", {
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) return 0;

  const data = (await response.json()) as { count?: number };
  return typeof data.count === "number" ? data.count : 0;
}

/**
 * 하단 글로벌 탭바
 *
 * [기능]
 * - 최상위 탭 경로 및 타 유저 프로필/채널 페이지에서 노출
 * - 현재 경로 기준 active 상태 표시
 * - 모바일 하단 고정 내비게이션 제공
 * - 신호 탭에 전체 채팅 미읽음 수를 표시하고 query invalidation으로 최신화
 */
export default function TabBar({
  userId,
  initialUnreadChatCount = 0,
}: TabBarProps) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [shellBounds, setShellBounds] = useState<{
    left: number;
    width: number;
  } | null>(null);

  // 서버에서 받은 초기값으로 첫 렌더 뱃지를 채우고, 이후에는 query invalidation으로 최신화
  const unreadChatCountQuery = useQuery({
    queryKey: queryKeys.chats.unreadCount(userId ?? 0),
    queryFn: fetchUnreadChatMessageCount,
    enabled: Boolean(userId),
    initialData: initialUnreadChatCount,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!userId) return;

    const unreadQueryKey = queryKeys.chats.unreadCount(userId);
    const cachedUnreadCount =
      queryClient.getQueryData<number>(unreadQueryKey);

    // 채팅방 진입 후 클라이언트가 줄인 미읽음 수를 오래된 서버 초기값으로 되살리지 않음
    if (
      cachedUnreadCount === undefined ||
      initialUnreadChatCount < cachedUnreadCount
    ) {
      queryClient.setQueryData(unreadQueryKey, initialUnreadChatCount);
    }
  }, [initialUnreadChatCount, queryClient, userId]);

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

  // fixed 탭바가 AppWrapper 실제 폭과 어긋나지 않도록 브라우저/레이아웃 변화에 맞춰 보정
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

  const unreadChatCount =
    unreadChatCountQuery.data ?? initialUnreadChatCount;
  const unreadChatBadgeText =
    unreadChatCount > 99 ? "99+" : String(unreadChatCount);

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
            const isChatTab = tab.href === "/chat";
            const hasUnreadChat = isChatTab && unreadChatCount > 0;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch={false}
                aria-current={isActive ? "page" : undefined}
                aria-label={
                  hasUnreadChat
                    ? `${tab.label}, 읽지 않은 채팅 ${unreadChatCount}개`
                    : tab.label
                }
                className={cn(
                  // [상호작용] 터치 영역 44px 이상 보장 (그리드 높이로 자동 처리)
                  "flex flex-col items-center justify-center gap-1 h-full w-full",
                  "active:scale-95 transition-transform", // 클릭 시 살짝 눌리는 효과
                  "focus-ring-soft" // 키보드 접근성
                )}
              >
                <span className="relative inline-flex">
                  <Icon
                    className={cn(
                      "w-6 h-6 transition-colors duration-200",
                      isActive
                        ? "text-brand dark:text-brand-light"
                        : "text-muted"
                    )}
                    aria-hidden="true"
                  />
                  {hasUnreadChat ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute -right-2.5 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full",
                        "bg-danger px-1 text-[10px] font-bold leading-none text-white shadow-sm"
                      )}
                    >
                      {unreadChatBadgeText}
                    </span>
                  ) : null}
                </span>
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
