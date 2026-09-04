/**
 * File Name : features/notification/components/NotificationListener.tsx
 * Description : 푸시 알림 및 시스템 이벤트 리스너 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.22  임도헌   Created
 * 2024.12.22  임도헌   Modified  푸시 알림 리스너 컴포넌트 추가
 * 2025.01.12  임도헌   Modified  푸시 알림 이미지 추가
 * 2025.07.24  임도헌   Modified  console.log(payload) 삭제
 * 2025.11.10  임도헌   Modified  유저 전용 채널/토스트 중복 억제/비가시 억제
 * 2025.12.28  임도헌   Modified  payload.userId 누락도 허용(하위 호환), STREAM 타입 반영,
 *                                toast dedupe 개선(id 우선), 채널 cleanup(removeChannel) 추가
 * 2026.01.08  임도헌   Modified  현재 채팅방(pathname)과 일치하는 알림은 토스트 무시 (중복 방지)
 * 2026.01.16  임도헌   Moved     components/common -> components/notification
 * 2026.01.17  임도헌   Moved     components/notification -> features/notification/components
 * 2026.02.08  임도헌   Modified  pathname 의존성 제거로 페이지 이동 시 연결 끊김 방지
 * 2026.02.11  임도헌   Modified  NotificationBell과의 채널 충돌 방지를 위해 로컬 이벤트 발행 로직 추가
 * 2026.02.22  임도헌   Modified  현재 페이지 알림 수신 시 벨 카운트 깜빡임(Flicker) 방지
 * 2026.02.28  임도헌   Modified  Zustand 스토어 도입 및 알림 로직 통합 (dispatchEvent 제거)
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.12  임도헌   Modified  BAN 실시간 이벤트는 무한 토스트 대신 세션 갱신 후 403 페이지 리다이렉트로 단일화
 * 2026.03.18  임도헌   Modified  실시간 토스트 링크와 현재 경로를 내부 경로 기준으로 정규화하고, 보기 액션의 returnTo 유지 및 중복 토스트 비교 로직을 함께 보강
 * 2026.04.13  임도헌   Modified  next/navigation 및 정적 toast/image 의존을 줄여 알림 후속 번들 평가 비용을 완화
 * 2026.04.22  임도헌   Modified  개인 sys_event를 전역 브리지 이벤트로 발행해 스트림 상세 운영 액션(강제 퇴장/채팅 금지/유저 차단)의 실시간 반영 경로를 단일화
 * 2026.05.17  임도헌   Modified  pagehide/hidden 상태에서 알림 채널을 정리하고 복귀 시 unread count를 서버 기준으로 재동기화
 * 2026.05.18  임도헌   Modified  채팅 알림 수신 시 TabBar 미읽음 query도 함께 재검증
 * 2026.08.21  임도헌   Modified  세션 JWT 인증 후 사용자 전용 private 채널만 구독
 * 2026.08.28  임도헌   Modified  알림 private 채널 구독 수명 주기 함수 JSDoc 보강
 * 2026.08.30  임도헌   Modified  실시간 이용 정지 후 403 안내 페이지로 이동하는 URL 생성 방식 보완
 * 2026.08.31  임도헌   Modified  짧은 화면 전환의 연결 해제를 지연하고 채널 중복 해제 제거
 * 2026.09.04  임도헌   Modified  앱 부팅·화면 복귀·채널 재연결 시 정지 상태 복구와 구독 오류 재시도 추가
 */
"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscribePrivateRealtimeChannel, supabase } from "@/lib/supabase";
import { useNotificationStore } from "@/components/global/providers/NotificationStoreProvider";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { getUnreadNotificationCount } from "@/features/notification/actions/count";
import { queryKeys } from "@/lib/queryKeys";
import { notificationRealtimeTopic } from "@/features/realtime/topics";
import { createRealtimeVisibilityCleanup } from "@/features/realtime/utils/visibilityCleanup";
import {
  redirectToBannedPage,
  refreshClientSessionStatus,
} from "@/features/auth/utils/sessionStatus";

type NotiPayload = {
  id?: number;
  userId: number;
  title: string;
  body: string;
  link?: string;
  image?: string;
  type?: "CHAT" | "TRADE" | "REVIEW" | "SYSTEM" | "BADGE" | "STREAM";
};

type SysEventPayload = {
  type:
    | "BAN"
    | "BLOCK"
    | "STREAM_KICK"
    | "STREAM_CHAT_MUTED"
    | "STREAM_CHAT_UNMUTED";
  reason?: string;
  until?: string; // BAN only
  actorId?: number; // BLOCK only
  streamId?: number;
};

function getCurrentPath() {
  if (typeof window === "undefined") return "";
  return sanitizeCallbackUrl(
    `${window.location.pathname}${window.location.search || ""}`
  );
}

/**
 * 전역 실시간 웹소켓 알림 및 시스템 이벤트 리스너 컴포넌트
 *
 * [상태 주입 및 보안 제어 로직]
 * - 세션 JWT로 보호된 사용자 개인 채널 구독을 통한 데이터 실시간 수신
 * - 새 알림 수신 시 Zustand 스토어의 `increment` 액션을 명시적으로 호출하여 뱃지 상태 동기화
 * - 사용자가 현재 보고 있는 화면(채팅방 등)과 동일한 컨텍스트의 알림 수신 시 토스트 알림 생략 처리(Flicker 방지)
 * - `sys_event` 수신 시 스트림 상세가 재사용하는 전역 브리지 이벤트를 먼저 발행
 * - `sys_event`(BAN) 수신 시 비인가 페이지(`/403`)로 즉시 이동
 * - 앱 부팅·화면 복귀·채널 재연결 시 DB 상태를 재확인해 놓친 BAN 이벤트 복구
 * - private 채널 인증·연결 오류 시 제한된 지수형 backoff로 재구독
 *
 * @param {number} userId - 로그인한 사용자 ID
 */
export default function NotificationListener({ userId }: { userId: number }) {
  const queryClient = useQueryClient();
  // Zustand 스토어에서 알림 카운트 증가 액션 가져오기
  const increment = useNotificationStore((state) => state.increment);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  /**
   * 실시간 토스트의 상세 이동 경로 계산
   * - 이미 returnTo/callbackUrl이 있는 링크는 중복 부여 방지
   * - 현재 경로를 returnTo로 덧붙여 알림 센터와 같은 복귀 문맥 유지
   */
  const buildToastHref = (href?: string) => {
    if (!href) return "";
    const safeHref = sanitizeCallbackUrl(href);
    if (safeHref.includes("returnTo=") || safeHref.includes("callbackUrl=")) {
      return safeHref;
    }
    const currentPath = getCurrentPath();
    if (safeHref === window.location.pathname || safeHref === currentPath) {
      return currentPath;
    }
    const separator = safeHref.includes("?") ? "&" : "?";
    return `${safeHref}${separator}returnTo=${encodeURIComponent(currentPath)}`;
  };

  /**
   * 현재 페이지 비교용 경로 정규화
   * - returnTo/callbackUrl 차이를 제거해 같은 상세 문맥이면 중복 토스트 생략
   */
  const normalizeComparableHref = (href: string) => {
    const [path, queryString = ""] = sanitizeCallbackUrl(href).split("?");
    const params = new URLSearchParams(queryString);
    params.delete("returnTo");
    params.delete("callbackUrl");
    const normalizedQuery = params.toString();
    return normalizedQuery ? `${path}?${normalizedQuery}` : path;
  };

  useEffect(() => {
    if (!userId) return;

    const channelName = notificationRealtimeTopic(userId);
    let mounted = true;
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;
    let authorizationController: AbortController | null = null;
    const sessionStatusController = new AbortController();
    let sessionStatusRequest: Promise<void> | null = null;
    let sessionStatusRecheckRequested = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    let canReconnect = document.visibilityState !== "hidden";
    let redirectStarted = false;
    const intentionallyClosedChannels = new WeakSet<object>();

    /** 중복 이동 없이 정지 안내 페이지로 전체 문서 전환 */
    const redirectToBanned = (reason?: string) => {
      if (!mounted || redirectStarted) return;
      redirectStarted = true;
      redirectToBannedPage(reason);
    };

    /** Realtime 이벤트 유실 여부와 무관하게 DB 최신 정지 상태 복구 */
    const reconcileSessionStatus = (recheckAfterPending = false) => {
      if (sessionStatusRequest) {
        if (recheckAfterPending) sessionStatusRecheckRequested = true;
        return sessionStatusRequest;
      }

      const request = refreshClientSessionStatus(sessionStatusController.signal)
        .then((status) => {
          if (status?.banned) redirectToBanned();
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          console.error(
            "[Notification] Session status reconciliation failed:",
            error instanceof Error ? error.message : "UnknownError"
          );
        })
        .finally(() => {
          if (sessionStatusRequest === request) sessionStatusRequest = null;
          if (mounted && sessionStatusRecheckRequested) {
            sessionStatusRecheckRequested = false;
            void reconcileSessionStatus();
          }
        });

      sessionStatusRequest = request;
      return request;
    };

    const syncUnreadCount = async () => {
      const nextCount = await getUnreadNotificationCount();
      if (!mounted) return;
      setUnreadCount(nextCount);
    };

    const syncChatUnreadCount = () => {
      // CHAT 알림은 알림 벨과 별개로 채팅 뱃지도 바꿀 수 있어 보조 재검증 경로를 둠
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chats.list(userId),
        refetchType: "active",
      });
      void queryClient.refetchQueries({
        queryKey: queryKeys.chats.unreadCount(userId),
        type: "all",
      });
    };

    /** 현재 알림 채널의 인증 요청과 WebSocket 객체 정리 */
    const unsubscribe = () => {
      if (!activeChannel) return;
      const channel = activeChannel;
      intentionallyClosedChannels.add(channel);
      activeChannel = null;
      authorizationController?.abort();
      authorizationController = null;

      // removeChannel이 구독 해제와 객체 제거를 함께 처리하므로 별도 unsubscribe를 중복 호출하지 않는다.
      void supabase.removeChannel(channel);
    };

    /** 연결 오류가 반복돼도 최대 30초 간격으로 제한되는 재구독 예약 */
    const scheduleReconnect = () => {
      if (!mounted || !canReconnect || reconnectTimer) return;

      const delayMs = Math.min(1000 * 2 ** reconnectAttempts, 30_000);
      reconnectAttempts += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!mounted || !canReconnect) return;
        unsubscribe();
        subscribe();
      }, delayMs);
    };

    /** 사용자 알림 private 채널 생성과 세션 JWT 인증 구독 시작 */
    function subscribe() {
      if (activeChannel) return;

      const channel = supabase.channel(channelName, {
        config: { private: true },
      });

      channel
        .on("broadcast", { event: "notification" }, async ({ payload }) => {
          const p = payload as Partial<NotiPayload>;

          if (typeof p.userId === "number" && p.userId !== userId) return;

          if (p.type === "CHAT") {
            // 알림 채널은 배포 환경에서 이미 살아 있는 사용자 채널이므로 채팅 뱃지 재검증 보조 경로로 활용
            syncChatUnreadCount();
          }

          // 사용자가 현재 보고 있는 페이지(예: 지금 대화 중인 채팅방)와 관련된 알림일 경우,
          // 토스트 팝업 표시 및 상단 뱃지 카운트 증가를 생략하여 번쩍거리는 UX 결함을 방지
          if (
            typeof document !== "undefined" &&
            !document.hidden &&
            p.link &&
            normalizeComparableHref(getCurrentPath()) ===
              normalizeComparableHref(p.link)
          ) {
            return;
          }

          // 기존 window.dispatchEvent 방식 대신 Zustand 액션을 명시적으로 호출
          increment();
          const { toast } = await import("sonner");

          // 토스트 알림 표시
          const toastId = p.id
            ? `noti:${p.id}`
            : `noti:${p.type ?? "SYSTEM"}:${p.link ?? ""}`;

          toast(p.title ?? "알림", {
            id: toastId,
            description: p.body ?? "",
            icon: p.image ? (
              <span
                aria-hidden="true"
                className="block h-6 w-6 rounded-full bg-cover bg-center"
                style={{ backgroundImage: `url(${p.image})` }}
              />
            ) : undefined,
            action: p.link
              ? {
                  label: "보기",
                  onClick: () => {
                    const href = buildToastHref(p.link!);
                    if (href) {
                      window.location.assign(href);
                    }
                  },
                }
              : undefined,
          });
        })
        .on("broadcast", { event: "sys_event" }, async ({ payload }) => {
          const p = payload as SysEventPayload;

          // 개인 운영 이벤트는 전역 브리지로 먼저 흘려 보내고,
          // 각 화면은 필요한 타입만 골라 강제 퇴장/채팅 금지/차단 반응을 즉시 동기화
          window.dispatchEvent(
            new CustomEvent("app:sys-event", {
              detail: p,
            })
          );

          // 실시간 정지(BAN) 처리
          if (p.type === "BAN") {
            // 403 서버 화면이 DB에서 최신 사유·기간을 조회하므로 별도 fetch 완료를 기다리지 않고 즉시 이동
            redirectToBanned(p.reason);
          }
        });

      const controller = new AbortController();
      authorizationController = controller;
      activeChannel = channel;

      void subscribePrivateRealtimeChannel(
        channel,
        controller.signal,
        (status) => {
          if (!mounted || intentionallyClosedChannels.has(channel)) return;

          if (status === "SUBSCRIBED") {
            reconnectAttempts = 0;
            if (reconnectTimer) {
              clearTimeout(reconnectTimer);
              reconnectTimer = null;
            }
            // 최초 상태 조회와 join 사이에 발생한 정지도 놓치지 않도록 완료 후 재확인 허용
            void reconcileSessionStatus(true);
            return;
          }

          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            scheduleReconnect();
          }
        }
      ).then((authorized) => {
        if (!authorized && mounted && activeChannel === channel) {
          unsubscribe();
          scheduleReconnect();
        }
      });
    }

    const visibilityCleanup = createRealtimeVisibilityCleanup(unsubscribe);

    const handlePageHide = () => {
      canReconnect = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      visibilityCleanup.flush();
    };

    const handlePageShow = () => {
      canReconnect = true;
      visibilityCleanup.cancel();
      subscribe();
      void syncUnreadCount();
      void reconcileSessionStatus();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        canReconnect = false;
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        // 빠른 Alt+Tab에서는 연결을 유지하고 장기 백그라운드일 때만 정리한다.
        visibilityCleanup.schedule();
        return;
      }

      canReconnect = true;
      visibilityCleanup.cancel();
      subscribe();
      void syncUnreadCount();
      void reconcileSessionStatus();
    };

    /** 오프라인 동안 유실된 운영 이벤트를 네트워크 복구 직후 서버 상태로 보정 */
    const handleOnline = () => {
      if (!mounted) return;
      canReconnect = document.visibilityState !== "hidden";
      if (canReconnect) subscribe();
      void reconcileSessionStatus(true);
    };

    void reconcileSessionStatus();
    subscribe();
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      canReconnect = false;
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      visibilityCleanup.cancel();
      sessionStatusController.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      unsubscribe();
    };
  }, [userId, increment, queryClient, setUnreadCount]);

  return null;
}
