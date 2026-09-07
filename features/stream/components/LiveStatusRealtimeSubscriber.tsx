/**
 * File Name : features/stream/components/LiveStatusRealtimeSubscriber.tsx
 * Description : Supabase Realtime private 방송 상태 채널 구독 및 서버 상태 재검증
 * Author : 임도헌
 *
 * History
 * 2025.09.13  임도헌   Created   실시간 상태 반영(푸시 기반)
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.05.16  임도헌   Modified  live-status payload 타입을 명시해 any 캐스팅 제거
 * 2026.05.17  임도헌   Modified  상세 화면 상태 동기화 콜백을 추가해 live-status 구독 지점을 셸로 단일화
 * 2026.08.21  임도헌   Modified  원본 Cloudflare UID 대신 내부 방송 ID로 상세 상태 이벤트 매칭
 * 2026.08.21  임도헌   Modified  JWT private 구독과 식별자-only 무효화 payload 적용
 */
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  subscribePrivateRealtimeChannel,
  supabase,
} from "@/lib/supabase";
import { LIVE_STATUS_REALTIME_TOPIC } from "@/features/realtime/topics";

interface Props {
  /** (선택) 최소 새로고침 간격(ms). 디폴트 250ms 디바운스 + 가시성 휴면 */
  minIntervalMs?: number;
  /** 특정 방송 상세에서만 상태 콜백을 받을 때 사용하는 Broadcast PK */
  broadcastId?: number;
}

/**
 * 전역적인 방송 상태 변경 이벤트를 구독하여 페이지를 새로고침(refresh)하는 컴포넌트
 * - 주로 목록 페이지나 상세 페이지 상단에 배치하여 실시간성을 보장
 * - `stream:status` private 채널을 구독
 * - payload를 화면 상태로 신뢰하지 않고 내부 방송 ID만 확인한 뒤 Server Component를 재검증
 * - 디바운스 및 가시성 체크를 통해 불필요한 새로고침을 방지
 */
export default function LiveStatusRealtimeSubscriber({
  minIntervalMs = 250,
  broadcastId,
}: Props) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingVisibilityRefreshRef = useRef<boolean>(false);

  useEffect(() => {
    const authorizationController = new AbortController();
    const debouncedRefresh = () => {
      // 백그라운드면 가시성 복귀 때 한 번만 갱신
      if (typeof document !== "undefined" && document.hidden) {
        if (!pendingVisibilityRefreshRef.current) {
          pendingVisibilityRefreshRef.current = true;
          const onVisible = () => {
            pendingVisibilityRefreshRef.current = false;
            document.removeEventListener("visibilitychange", onVisible);
            router.refresh();
          };
          document.addEventListener("visibilitychange", onVisible, {
            once: true,
          });
        }
        return;
      }

      if (timerRef.current) return;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        router.refresh();
      }, minIntervalMs);
    };

    const channel = supabase.channel(LIVE_STATUS_REALTIME_TOPIC, {
      config: { private: true },
    });

    channel.on("broadcast", { event: "status" }, (msg) => {
      const payload = (msg as { payload?: { broadcastId?: unknown } }).payload;
      if (typeof payload?.broadcastId !== "number") return;
      if (broadcastId && payload.broadcastId !== broadcastId) return;

      debouncedRefresh();
    });

    void subscribePrivateRealtimeChannel(
      channel,
      authorizationController.signal
    );

    return () => {
      authorizationController.abort();
      try {
        channel.unsubscribe();
      } catch {}
      try {
        // 채널 객체를 클라이언트에서 완전히 제거 (누수 방지)
        supabase.removeChannel(channel);
      } catch {}
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [router, minIntervalMs, broadcastId]);

  return null;
}
