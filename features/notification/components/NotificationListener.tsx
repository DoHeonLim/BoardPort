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
 * - `sys_event`(BAN) 수신 시 세션 쿠키 강제 갱신 및 비인가 페이지(`/403`) 리다이렉트 수행
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

    /** 사용자 알림 private 채널을 생성하고 세션 JWT 인증 구독을 시작한다. */
    const subscribe = () => {
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
            try {
              // 1. 서버 세션 쿠키 갱신 (banned: true 설정)
              await fetch("/api/auth/refresh", { method: "POST" });
            } catch (e) {
              console.error("Session refresh failed", e);
            }

            // 2. 강제 페이지 이동 (SPA 라우팅 대신 href를 사용하여 미들웨어를 거치도록 강제)
            window.location.href = `/403?reason=BANNED&banReason=${encodeURIComponent(
              p.reason || ""
            )}`;
          }
        });

      authorizationController = new AbortController();
      void subscribePrivateRealtimeChannel(
        channel,
        authorizationController.signal
      );
      activeChannel = channel;
    };

    /** 알림 채널 인증과 WebSocket 채널 객체를 함께 정리한다. */
    const unsubscribe = () => {
      if (!activeChannel) return;
      const channel = activeChannel;
      activeChannel = null;
      authorizationController?.abort();
      authorizationController = null;

      channel.unsubscribe();
      // 언마운트/페이지 이탈/백그라운드 전환 시 채널 객체까지 제거해 WebSocket 상주 시간을 줄임
      supabase.removeChannel(channel);
    };

    const handlePageHide = () => {
      unsubscribe();
    };

    const handlePageShow = () => {
      subscribe();
      void syncUnreadCount();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        unsubscribe();
        return;
      }

      subscribe();
      void syncUnreadCount();
    };

    subscribe();
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribe();
    };
  }, [userId, increment, queryClient, setUnreadCount]);

  return null;
}
