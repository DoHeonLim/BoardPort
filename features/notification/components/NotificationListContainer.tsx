/**
 * File Name : features/notification/components/NotificationListContainer.tsx
 * Description : 사용자의 알림 목록을 표시하는 UI 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.08  임도헌   Created   알림 목록 UI 구현 및 읽음 처리 연동
 * 2026.02.28  임도헌   Modified  Zustand 스토어 도입 및 알림 로직 통합 (액션 연결)
 */
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import AdminPagination from "@/features/report/components/admin/AdminPagination";
import TimeAgo from "@/components/ui/TimeAgo";
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from "@/features/notification/actions/list";
import type {
  NotificationListResponse,
  NotificationItem,
} from "@/features/notification/service/notification";
import { EnvelopeIcon, EnvelopeOpenIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/components/global/providers/NotificationStoreProvider";

interface Props {
  data: NotificationListResponse;
}

/**
 * 알림 목록 컨테이너
 *
 * [기능]
 * 1. 사용자가 받은 알림 목록을 최신순으로 표시함.
 * 2. 알림의 `isRead` 상태에 따라 스타일을 다르게 적용함.
 * 3. `markNotificationAsReadAction`을 통해 단일 알림을 읽음 처리하고, 성공 시 Zustand 상태를 동기화하여 차감함.
 * 4. `markAllNotificationsAsReadAction`을 통해 모든 알림을 읽음 처리하고, 성공 시 Zustand 상태를 초기화함.
 */
export default function NotificationListContainer({ data }: Props) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    data.items
  );
  const [isMarkingAll, startMarkingAll] = useTransition();

  // Zustand 액션 가져오기
  const decrement = useNotificationStore((state) => state.decrement);
  const clear = useNotificationStore((state) => state.clear);

  const handleMarkAsRead = async (id: number) => {
    const res = await markNotificationAsReadAction(id);
    if (res.success) {
      setNotifications((prev) =>
        prev.map((noti) => (noti.id === id ? { ...noti, isRead: true } : noti))
      );
      // 알림 읽음 처리 완료 시 전역 뱃지 카운트 1 차감
      decrement(1);
    } else {
      toast.error(res.error ?? "읽음 처리 실패");
    }
  };

  const handleMarkAllAsRead = () => {
    startMarkingAll(async () => {
      const res = await markAllNotificationsAsReadAction();
      if (res.success) {
        setNotifications((prev) =>
          prev.map((noti) => ({ ...noti, isRead: true }))
        );
        toast.success("모든 알림을 읽음 처리했습니다.");
        // 모두 읽음 처리 완료 시 전역 뱃지 카운트 초기화
        clear();
      } else {
        toast.error(res.error ?? "모든 알림 읽음 처리 실패");
      }
    });
  };

  // 알림 타입별 아이콘 매핑
  const typeIcons: Record<string, JSX.Element> = {
    CHAT: <span className="text-xl">💬</span>,
    TRADE: <span className="text-xl">⚓</span>,
    REVIEW: <span className="text-xl">⭐</span>,
    BADGE: <span className="text-xl">🎖️</span>,
    SYSTEM: <span className="text-xl">📢</span>,
    STREAM: <span className="text-xl">📺</span>,
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-bold text-primary">알림</h2>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors bg-brand/10 text-brand dark:bg-brand-light/10 dark:text-brand-light hover:bg-brand/20"
          >
            {isMarkingAll && (
              <span className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            모두 읽음 ({unreadCount})
          </button>
        )}
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        {notifications.length === 0 ? (
          <div className="px-6 py-16 text-center text-muted">
            <p className="text-sm">도착한 알림이 없습니다.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 transition-colors",
                  notification.isRead
                    ? "bg-surface opacity-60"
                    : "bg-surface hover:bg-surface-dim/50"
                )}
              >
                <div className="relative size-11 shrink-0 flex items-center justify-center rounded-xl bg-surface-dim border border-border text-2xl">
                  {notification.image ? (
                    <Image
                      src={notification.image}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover rounded-xl"
                    />
                  ) : (
                    <span className="drop-shadow-sm">
                      {typeIcons[notification.type] || (
                        <EnvelopeIcon className="size-5" />
                      )}
                    </span>
                  )}
                  {!notification.isRead && (
                    <span className="absolute -top-1 -right-1 size-3 bg-danger rounded-full border-2 border-surface animate-pulse" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <Link
                    href={notification.link || "#"}
                    onClick={() => handleMarkAsRead(notification.id)}
                    className={cn(
                      "font-bold line-clamp-1 transition-colors",
                      notification.isRead
                        ? "text-muted"
                        : "text-primary hover:text-brand"
                    )}
                  >
                    {notification.title}
                  </Link>
                  <p className="text-sm text-muted line-clamp-2 mt-0.5 leading-snug">
                    {notification.body}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <TimeAgo
                      date={notification.created_at}
                      className="text-[10px]"
                    />
                  </div>
                </div>

                {!notification.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="p-2 text-muted hover:text-brand dark:hover:text-brand-light transition-colors"
                    title="읽음 처리"
                  >
                    <EnvelopeOpenIcon className="size-5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <AdminPagination
        currentPage={data.currentPage}
        totalPages={data.totalPages}
      />
    </div>
  );
}
