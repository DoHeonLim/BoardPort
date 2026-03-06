/**
 * File Name : components\global\NotificationBell.tsx
 * Description : 실시간 알림 벨 아이콘 컴포넌트 (Badge 포함)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.08  임도헌   Created   실시간 카운트 갱신 및 뱃지 UI 구현
 * 2026.02.11  임도헌   Modified  Supabase 구독 제거 -> window event 수신으로 변경 (BAN 기능 정상화)
 * 2026.02.12  임도헌   Modified  뱃지 UI 변경 (Dot -> Number Count)
 * 2026.02.26  임도헌   Modified  다크모드 개선
 * 2026.02.28  임도헌   Modified  Zustand 스토어 도입 및 알림 로직 통합 (DOM 이벤트 리스너 제거)
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
import { BellIcon as BellIconSolid } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/components/global/providers/NotificationStoreProvider";

interface NotificationBellProps {
  initialCount?: number;
  userId: number | null;
  className?: string;
}

/**
 * 전역 상단 알림 벨 및 뱃지 UI 컴포넌트
 *
 * [상태 주입 및 동기화 로직]
 * - 서버로부터 주입된 초기 카운트(`initialCount`)를 `useNotificationStore`에 하이드레이션(Hydration) 처리
 * - Zustand 전역 상태(`unreadCount`) 구독을 통한 실시간 카운트 증감 및 뱃지 UI 조건부 렌더링 적용
 * - 기존 Event Bus 리스너 방식 제거를 통한 메모리 누수 원천 차단
 *
 * @param {NotificationBellProps} props
 */
export default function NotificationBell({
  initialCount = 0,
  userId,
  className,
}: NotificationBellProps) {
  // Zustand 스토어 상태 및 액션 구독
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  // 컴포넌트 마운트 시 서버 상태(initialCount)로 스토어를 동기화
  useEffect(() => {
    setUnreadCount(initialCount);
  }, [initialCount, setUnreadCount]);

  if (!userId) return null;

  return (
    <Link
      href="/profile/notifications/list"
      className={cn(
        "relative flex items-center justify-center size-10 rounded-xl transition-colors",
        "bg-surface border border-border text-muted hover:text-primary hover:bg-surface-dim active:scale-95",
        className
      )}
      aria-label={`알림 ${unreadCount > 0 ? `${unreadCount}개 안 읽음` : ""}`}
    >
      {unreadCount > 0 ? (
        <BellIconSolid className="size-6 text-brand dark:text-brand-light" />
      ) : (
        <BellIcon className="size-6" />
      )}

      {/* Number Badge */}
      {unreadCount > 0 && (
        <span
          className={cn(
            "absolute -top-0.5 -right-0.5 flex items-center justify-center",
            "min-w-[18px] h-[18px] px-1",
            "text-[10px] font-bold text-white leading-none",
            "bg-danger rounded-full border-2 border-surface shadow-sm",
            "animate-fade-in"
          )}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
