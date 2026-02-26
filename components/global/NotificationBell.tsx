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
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
import { BellIcon as BellIconSolid } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  initialCount?: number;
  userId: number | null;
  className?: string;
}

/**
 * 전역 알림 벨 컴포넌트
 *
 * [동작 원리]
 * 1. 초기값(`initialCount`)을 받아 렌더링합
 * 2. 직접 네트워크 연결을 맺지 않음
 *    - `NotificationListener`가 수신한 알림 이벤트를 `window.dispatchEvent`로 전파하면,
 *    - 이 컴포넌트가 `sys:notification` 이벤트를 감지하여 카운트를 증가
 * 3. 이를 통해 페이지 이동 시 컴포넌트가 언마운트되어도 전역 Supabase 연결이 끊기는 부작용을 막음
 *
 * @param {NotificationBellProps} props
 */
export default function NotificationBell({
  initialCount = 0,
  userId,
  className,
}: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(initialCount);

  // 서버 상태와 초기 동기화
  useEffect(() => {
    setUnreadCount(initialCount);
  }, [initialCount]);

  // 로컬 이벤트 리스너 등록
  useEffect(() => {
    if (!userId) return;
    const handleNew = () => setUnreadCount((prev) => prev + 1);

    const handleRead = (e: any) =>
      setUnreadCount((prev) => Math.max(0, prev - (e.detail?.count || 1)));
    const handleReadAll = () => setUnreadCount(0);

    window.addEventListener("sys:notification", handleNew);
    window.addEventListener("sys:notification_read", handleRead);
    window.addEventListener("sys:notification_read_all", handleReadAll);

    return () => {
      window.removeEventListener("sys:notification", handleNew);
      window.removeEventListener("sys:notification_read", handleRead);
      window.removeEventListener("sys:notification_read_all", handleReadAll);
    };
  }, [userId]);

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
