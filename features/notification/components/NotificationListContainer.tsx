/**
 * File Name : features/notification/components/NotificationListContainer.tsx
 * Description : 사용자의 알림 목록을 표시하는 UI 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.08  임도헌   Created   알림 목록 UI 구현 및 읽음 처리 연동
 * 2026.02.28  임도헌   Modified  Zustand 스토어 도입 및 알림 로직 통합 (액션 연결)
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.12  임도헌   Modified  알림 센터 전용 이전/다음 페이지네이션으로 교체
 * 2026.03.12  임도헌   Modified  data.items 변경 시 페이지 전환 결과를 로컬 목록 상태에 재동기화
 * 2026.03.13  임도헌   Modified  알림 목록에서 진입하는 링크에 현재 알림 센터 경로를 returnTo로 함께 전달
 * 2026.03.15  임도헌   Modified  알림 목록 헤더에 설정 진입 링크를 추가하고 링크 없는 알림의 읽음 전용 상태를 명확화
 * 2026.03.15  임도헌   Modified  알림 타입 아이콘을 이모지에서 heroicons 기반 시스템 아이콘으로 통일
 * 2026.03.16  임도헌   Modified  알림 필터를 서버 기준 전체 개수/전체 결과 기반으로 정리
 * 2026.03.16  임도헌   Modified  알림 센터 헤더의 키워드 버튼이 전용 관리 모달을 열도록 정리
 * 2026.03.16  임도헌   Modified  알림 필터 전환은 replace로 처리해 BackButton이 진입점으로 복귀하도록 정리
 * 2026.03.17  임도헌   Modified  링크형 알림에 명시적 보기 버튼을 추가해 이동 가능성을 더 쉽게 인지하도록 보강
 * 2026.03.17  임도헌   Modified  작은 화면에서 알림 센터 상단 액션이 과밀하지 않도록 2행 반응형 배치로 조정
 * 2026.03.18  임도헌   Modified  알림 링크를 내부 경로 기준으로 정규화하고 자기 자신/기존 returnTo 링크에는 중복 returnTo를 부여하지 않도록 정리
 * 2026.03.19  임도헌   Modified  알림 센터 현재 경로도 내부 경로 기준으로 정규화해 settings/상세 왕복의 raw returnTo 재전파를 방지
 * 2026.03.19  임도헌   Modified  링크형 알림 행의 보기/읽음 액션을 모바일에서 세로 분리해 작은 화면 과밀을 완화
 * 2026.03.19  임도헌   Modified  알림 행 전체를 모바일 기준 상단 정렬로 조정해 긴 본문과 읽음 액션의 밀도 충돌을 완화
 * 2026.03.23  임도헌   Modified  알림 센터 카드 셸과 리스트 구분선을 구조선 기준으로 border-border-subtle에 맞춰 정리
 * 2026.03.28  임도헌   Modified  링크형 알림은 이동 전에 읽음 처리를 완료하도록 버튼 기반 탐색으로 정리
 * 2026.04.02  임도헌   Modified  알림 필터 라벨과 타입을 notification constants/types 공용 정의로 분리
 * 2026.04.10  임도헌   Modified  notification 타이포 정책에 맞춰 상단 액션/필터/보조 CTA의 weight와 text-xs 스케일을 정리
 * 2026.04.18  임도헌   Modified  설정 링크 prefetch를 끄고 키워드 모달/읽은 알림 대비를 정리해 알림 목록 초기 렌더 부담을 완화
 * 2026.04.26  임도헌   Modified  좁은 화면에서도 링크형 알림의 보기 버튼이 제목 행 오른쪽에 유지되도록 2열 배치로 정리
 * 2026.04.26  임도헌   Modified  개별 읽음 처리를 "읽음으로 표시" 보조 버튼으로 정리해 보기 액션과 구분
 * 2026.04.26  임도헌   Modified  읽음 액션 토스트 문구를 화면 버튼 라벨과 같은 표현으로 통일
 * 2026.05.23  임도헌   Modified  삭제된 콘텐츠의 오래된 알림 이미지가 깨질 때 타입 아이콘으로 fallback 처리
 * 2026.05.24  임도헌   Modified  삭제된 콘텐츠 알림의 이동 불가 보조 문구 추가
 * 2026.05.25  임도헌   Modified  허용된 이미지 출처만 렌더링해 오래된 알림 이미지 URL 예외 방어
 * 2026.05.25  임도헌   Modified  알림 상세 이동을 먼저 수행하고 읽음 처리는 후속 동기화로 분리
 * 2026.05.25  임도헌   Modified  알림 이미지/삭제 콘텐츠 렌더링 판단을 테스트 가능한 유틸로 분리
 * 2026.06.19  임도헌   Modified  모바일 긴 알림 본문 더보기와 알림센터 자기 링크 버튼 숨김 처리 추가
 * 2026.06.21  임도헌   Modified  모바일 알림 제목/본문 펼침 기준을 실제 clamp overflow 측정으로 보정
 */
"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import TimeAgo from "@/components/ui/TimeAgo";
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from "@/features/notification/actions/list";
import { NOTIFICATION_FILTER_LABELS } from "@/features/notification/constants";
import NotificationPagination from "@/features/notification/components/NotificationPagination";
import type {
  NotificationListResponse,
  NotificationItem,
  NotificationFilter,
} from "@/features/notification/types";
import {
  ArrowsRightLeftIcon,
  BellAlertIcon,
  ChatBubbleBottomCenterTextIcon,
  ChatBubbleLeftEllipsisIcon,
  CheckBadgeIcon,
  Cog6ToothIcon,
  ArrowUpRightIcon,
  MagnifyingGlassIcon,
  PlayCircleIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/components/global/providers/NotificationStoreProvider";
import type { RegionRange } from "@/generated/prisma/enums";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import {
  isRenderableNotificationImage,
  shouldShowUnavailableNotificationCopy,
} from "@/features/notification/utils/rendering";

interface Props {
  data: NotificationListResponse;
  keywordAlerts: { id: number; keyword: string; regionRange: RegionRange }[];
  userLocation: {
    region1?: string | null;
    region2?: string | null;
    region3?: string | null;
    regionRange: string;
  };
}

const KeywordAlertModal = dynamic(
  () => import("@/features/notification/components/KeywordAlertModal"),
  { ssr: false }
);

interface NotificationTextBlockProps {
  notification: NotificationItem;
  isLinkedNotification: boolean;
  isExpanded: boolean;
  onOpen: (notification: NotificationItem) => void;
  onMarkAsRead: (id: number) => void;
  onToggleExpanded: (id: number) => void;
}

function NotificationTextBlock({
  notification,
  isLinkedNotification,
  isExpanded,
  onOpen,
  onMarkAsRead,
  onToggleExpanded,
}: NotificationTextBlockProps) {
  const titleRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    if (isExpanded) return;

    const measureOverflow = () => {
      const title = titleRef.current;
      const body = bodyRef.current;
      const titleOverflow =
        title !== null && title.scrollHeight > title.clientHeight + 1;
      const bodyOverflow =
        body !== null && body.scrollHeight > body.clientHeight + 1;
      setCanExpand(titleOverflow || bodyOverflow);
    };

    measureOverflow();
    const rafId = window.requestAnimationFrame(measureOverflow);

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureOverflow);
      return () => {
        window.cancelAnimationFrame(rafId);
        window.removeEventListener("resize", measureOverflow);
      };
    }

    const observer = new ResizeObserver(measureOverflow);
    if (titleRef.current) observer.observe(titleRef.current);
    if (bodyRef.current) observer.observe(bodyRef.current);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [isExpanded, notification.body, notification.title]);

  return (
    <>
      {isLinkedNotification ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:gap-3">
          <button
            ref={titleRef}
            type="button"
            onClick={() => onOpen(notification)}
            className={cn(
              "focus-ring-soft min-w-0 flex-1 rounded-md px-1 py-0.5 text-left text-[15px] font-bold leading-snug transition-colors sm:text-base",
              isExpanded
                ? "line-clamp-none sm:line-clamp-1"
                : "line-clamp-2 sm:line-clamp-1",
              notification.isRead
                ? "text-slate-600 dark:text-slate-300"
                : "text-primary hover:text-brand dark:hover:text-brand-light"
            )}
          >
            {notification.title}
          </button>
          {/* 링크형 알림은 별도 CTA를 노출해 이동 동작 인지성 보강 */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onOpen(notification)}
              className="focus-ring-soft inline-flex shrink-0 items-center gap-1 rounded-full border border-border-strong px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-border-strong hover:bg-surface-dim hover:text-primary dark:text-slate-200"
            >
              보기
              <ArrowUpRightIcon className="size-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          ref={titleRef}
          type="button"
          onClick={() => onMarkAsRead(notification.id)}
          className={cn(
            "focus-ring-soft rounded-md px-1 py-0.5 text-left text-[15px] font-bold leading-snug transition-colors sm:text-base",
            isExpanded
              ? "line-clamp-none sm:line-clamp-1"
              : "line-clamp-2 sm:line-clamp-1",
            notification.isRead
              ? "text-slate-600 dark:text-slate-300"
              : "text-primary hover:text-brand dark:hover:text-brand-light"
          )}
        >
          {notification.title}
        </button>
      )}
      <p
        ref={bodyRef}
        className={cn(
          "mt-0.5 text-sm leading-snug text-slate-600 dark:text-slate-300",
          isExpanded ? "line-clamp-none sm:line-clamp-2" : "line-clamp-2"
        )}
      >
        {notification.body}
      </p>
      {canExpand && (
        <button
          type="button"
          onClick={() => onToggleExpanded(notification.id)}
          className="focus-ring-soft mt-1 inline-flex rounded px-1 py-0.5 text-xs font-bold text-brand transition-colors hover:text-brand-dark sm:hidden dark:text-brand-light"
        >
          {isExpanded ? "접기" : "더보기"}
        </button>
      )}
    </>
  );
}

/**
 * 알림함 목록 및 읽음 처리 컨테이너 컴포넌트
 *
 * [상호작용 및 상태 제어 로직]
 * - 서버 액션(`markNotificationAsReadAction` 등)을 호출하여 알림 읽음 데이터 영속화 처리
 * - 성공 시 로컬 상태 업데이트 및 Zustand 스토어(`decrement`, `clear`) 액션 호출을 통한 전역 벨 뱃지 즉각 동기화 적용
 * - 페이지 전환 시 서버에서 받은 `data.items`를 로컬 목록 상태에 재동기화
 * - 알림 필터는 URL 쿼리와 서버 응답(`activeFilter`, `filterCounts`) 기준으로 동기화
 * - 키워드 버튼은 전용 관리 모달을 열고, 설정 버튼은 전체 설정 페이지로 이동
 * - 링크형 알림은 제목 링크와 별도 보기 버튼을 함께 제공해 이동 동작을 명확화
 * - 알림 타입에 따른 동적 아이콘 매핑 및 시각적 스타일링 처리
 */
export default function NotificationListContainer({
  data,
  keywordAlerts,
  userLocation,
}: Props) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    data.items
  );
  const [failedImageIds, setFailedImageIds] = useState<Set<number>>(
    () => new Set()
  );
  const [expandedNotificationIds, setExpandedNotificationIds] = useState<
    Set<number>
  >(() => new Set());
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [isMarkingAll, startMarkingAll] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.toString();
  // 알림 센터 현재 경로도 내부 경로 기준으로 정규화해 nested returnTo 예외를 완화
  const currentHref = sanitizeCallbackUrl(
    currentQuery ? `${pathname}?${currentQuery}` : pathname
  );
  const activeFilter = data.activeFilter;

  useEffect(() => {
    // 서버 응답 기준 로컬 목록 재동기화
    setNotifications(data.items);
    setFailedImageIds(new Set());
    setExpandedNotificationIds(new Set());
  }, [data.items]);

  // Zustand 액션 가져오기
  const decrement = useNotificationStore((state) => state.decrement);
  const clear = useNotificationStore((state) => state.clear);

  /**
   * 개별 알림 읽음 처리와 전역 뱃지 동기화
   */
  const handleMarkAsRead = async (id: number) => {
    const res = await markNotificationAsReadAction(id);
    if (res.success) {
      setNotifications((prev) =>
        prev.map((noti) => (noti.id === id ? { ...noti, isRead: true } : noti))
      );
      // 알림 읽음 처리 완료 시 전역 뱃지 카운트 1 차감
      decrement(1);
    } else {
      toast.error(res.error ?? "알림을 읽음으로 표시하지 못했어요.");
    }
  };

  /**
   * 전체 알림 읽음 처리와 전역 뱃지 초기화
   */
  const handleMarkAllAsRead = () => {
    startMarkingAll(async () => {
      const res = await markAllNotificationsAsReadAction();
      if (res.success) {
        setNotifications((prev) =>
          prev.map((noti) => ({ ...noti, isRead: true }))
        );
        toast.success("모든 알림을 읽음으로 표시했어요.");
        // 모든 알림을 읽음으로 표시하면 전역 뱃지 카운트를 초기화
        clear();
      } else {
        toast.error(res.error ?? "모든 알림을 읽음으로 표시하지 못했어요.");
      }
    });
  };

  /**
   * 링크형 알림 열기 전 읽음 처리와 상세 이동
   */
  const handleOpenNotification = async (notification: NotificationItem) => {
    const href = buildNotificationHref(notification.link);
    if (!notification.isRead) {
      void markNotificationAsReadAction(notification.id)
        .then((res) => {
          if (res.success) {
            setNotifications((prev) =>
              prev.map((noti) =>
                noti.id === notification.id ? { ...noti, isRead: true } : noti
              )
            );
            decrement(1);
          } else {
            toast.error(res.error ?? "알림을 읽음으로 표시하지 못했어요.");
          }
        })
        .catch(() => {
          toast.error("알림을 읽음으로 표시하지 못했어요.");
        });
    }
    router.push(href);
  };

  // 알림 타입별 시스템 아이콘 매핑
  const typeIcons: Record<string, JSX.Element> = {
    CHAT: <ChatBubbleLeftEllipsisIcon className="size-5" />,
    TRADE: <ArrowsRightLeftIcon className="size-5" />,
    REVIEW: <ChatBubbleBottomCenterTextIcon className="size-5" />,
    BADGE: <CheckBadgeIcon className="size-5" />,
    SYSTEM: <BellAlertIcon className="size-5" />,
    STREAM: <PlayCircleIcon className="size-5" />,
    KEYWORD: <MagnifyingGlassIcon className="size-5" />,
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const filters: NotificationFilter[] = [
    "ALL",
    "TRADE",
    "CHAT",
    "REVIEW",
    "BADGE",
    "STREAM",
    "KEYWORD",
    "SYSTEM",
  ];
  const shouldShowUnavailableCopy = (notification: NotificationItem) =>
    shouldShowUnavailableNotificationCopy(notification);

  // 링크가 제거된 콘텐츠형 알림에만 이동 불가 안내를 보여준다.
  // 시스템/배지 알림은 원래 링크가 없을 수 있어 안내 대상에서 제외
  /**
   * 선택한 알림 필터로 이동하며 page 쿼리는 1페이지 기준으로 초기화
   * - 알림 센터 내부 상태 전환이므로 히스토리를 남기지 않도록 replace 사용
   */
  const changeFilter = (filter: NotificationFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === "ALL") {
      params.delete("filter");
    } else {
      params.set("filter", filter);
    }
    params.delete("page");
    router.replace(params.toString() ? `?${params.toString()}` : pathname);
  };
  /**
   * 현재 알림 센터 경로를 returnTo로 덧붙인 상세 이동 경로 계산
   * - 이미 returnTo/callbackUrl이 있는 링크는 중복 전파 방지
   * - 알림 센터 자기 자신을 가리키는 링크는 현재 경로 그대로 유지
   */
  const buildNotificationHref = (href?: string | null) => {
    if (!href) return "#";
    const safeHref = sanitizeCallbackUrl(href);
    if (safeHref.includes("returnTo=") || safeHref.includes("callbackUrl=")) {
      return safeHref;
    }
    if (safeHref === pathname || safeHref === currentHref) {
      return currentHref;
    }
    const separator = safeHref.includes("?") ? "&" : "?";
    return `${safeHref}${separator}returnTo=${encodeURIComponent(currentHref)}`;
  };
  const isNotificationCenterLink = (href?: string | null) => {
    if (!href) return false;
    const safeHref = sanitizeCallbackUrl(href);
    return (
      safeHref === "/profile/notifications/list" ||
      safeHref.startsWith("/profile/notifications/list?")
    );
  };
  const hasActionableLink = (notification: NotificationItem) =>
    !!notification.link && !isNotificationCenterLink(notification.link);
  const toggleBodyExpanded = (id: number) => {
    setExpandedNotificationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const settingsHref = `/profile/notifications/setting?returnTo=${encodeURIComponent(
    currentHref
  )}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-primary">알림</h2>
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setIsKeywordModalOpen(true)}
            className="focus-ring-soft inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-dim hover:text-primary sm:min-h-0 sm:px-3"
          >
            <MagnifyingGlassIcon className="size-4" />
            키워드
          </button>
          <Link
            href={settingsHref}
            prefetch={false}
            className="focus-ring-soft inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-dim hover:text-primary sm:min-h-0 sm:px-3"
          >
            <Cog6ToothIcon className="size-4" />
            설정
          </Link>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              aria-label={`모든 알림 ${unreadCount}개를 읽음으로 표시`}
              title="모든 알림을 읽음으로 표시"
              className="focus-ring-soft inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:border-brand/45 hover:bg-brand/15 disabled:opacity-60 dark:border-brand-light/30 dark:bg-brand-light/10 dark:text-brand-light dark:hover:bg-brand-light/15 sm:min-h-0 sm:gap-2"
            >
              {isMarkingAll && (
                <span className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              <span className="max-[359px]:hidden">모두 읽음</span>
              <span>({unreadCount})</span>
            </button>
          )}
        </div>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
        {filters.map((filter) => {
          // 서버 집계 기준 필터 카운트 표시
          const count = data.filterCounts[filter];
          return (
            <button
              key={filter}
              type="button"
              onClick={() => changeFilter(filter)}
              className={cn(
                "focus-ring-soft shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                activeFilter === filter
                  ? "border-brand bg-brand/10 text-brand dark:border-brand-light dark:bg-brand-light/10 dark:text-brand-light"
                  : "border-border bg-surface text-muted hover:border-border-strong hover:text-primary"
              )}
            >
              {NOTIFICATION_FILTER_LABELS[filter]} {count}
            </button>
          );
        })}
      </div>

      <div className="bg-surface rounded-2xl border border-border-subtle overflow-hidden shadow-sm">
        {notifications.length === 0 ? (
          <div className="px-6 py-16 text-center text-muted">
            <p className="text-sm">
              {activeFilter === "ALL"
                ? "도착한 알림이 없습니다."
                : `${NOTIFICATION_FILTER_LABELS[activeFilter]} 알림이 없습니다.`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {notifications.map((notification) => {
              const icon = typeIcons[notification.type] || (
                <BellAlertIcon className="size-5" />
              );
              const isLinkedNotification = hasActionableLink(notification);
              const isNotificationExpanded = expandedNotificationIds.has(
                notification.id
              );
              const canRenderImage =
                isRenderableNotificationImage(notification.image) &&
                !failedImageIds.has(notification.id);

              return (
                <li
                  key={notification.id}
                  style={{
                    contentVisibility: "auto",
                    containIntrinsicSize: "136px",
                  }}
                  className={cn(
                    "flex items-start gap-4 px-5 py-4 transition-colors sm:items-center",
                    notification.isRead
                      ? "bg-surface"
                      : "bg-surface hover:bg-surface-dim/50"
                  )}
                >
                  <div className="relative size-11 shrink-0 flex items-center justify-center rounded-xl bg-surface-dim border border-border-subtle text-brand dark:text-brand-light">
                    {canRenderImage ? (
                      <Image
                        src={notification.image!}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-cover rounded-xl"
                        onError={() => {
                          setFailedImageIds((prev) => {
                            const next = new Set(prev);
                            next.add(notification.id);
                            return next;
                          });
                        }}
                      />
                    ) : (
                      <span className="drop-shadow-sm">{icon}</span>
                    )}
                    {!notification.isRead && (
                      <span className="absolute -top-1 -right-1 size-3 bg-danger rounded-full border-2 border-surface animate-pulse" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <NotificationTextBlock
                      notification={notification}
                      isLinkedNotification={isLinkedNotification}
                      isExpanded={isNotificationExpanded}
                      onOpen={handleOpenNotification}
                      onMarkAsRead={handleMarkAsRead}
                      onToggleExpanded={toggleBodyExpanded}
                    />
                    {shouldShowUnavailableCopy(notification) && (
                      <p className="mt-1 text-xs leading-snug text-slate-500 dark:text-slate-400">
                        연결된 콘텐츠가 삭제되어 이동할 수 없습니다.
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <TimeAgo
                        date={notification.created_at}
                        className="text-xs text-slate-500 dark:text-slate-300"
                      />
                      {!notification.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(notification.id)}
                          aria-label={`${notification.title} 알림을 읽음으로 표시`}
                          title="읽음으로 표시"
                          className="focus-ring-soft inline-flex min-h-[24px] items-center rounded-full border border-brand/35 bg-brand/12 px-2.5 py-0.5 text-xs font-semibold text-brand shadow-[0_0_0_1px_rgba(59,130,246,0.04)] transition-colors hover:border-brand/50 hover:bg-brand/18 dark:border-brand-light/35 dark:bg-brand-light/12 dark:text-brand-light dark:hover:bg-brand-light/18"
                        >
                          읽음으로 표시
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <NotificationPagination
        currentPage={data.currentPage}
        totalPages={data.totalPages}
      />

      {isKeywordModalOpen ? (
        <KeywordAlertModal
          isOpen={isKeywordModalOpen}
          onClose={() => setIsKeywordModalOpen(false)}
          initialKeywords={keywordAlerts}
          userLocation={userLocation}
        />
      ) : null}
    </div>
  );
}
