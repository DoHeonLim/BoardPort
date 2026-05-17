/**
 * File Name : features/stream/components/LiveStatusRealtimeSubscriber.tsx
 * Description : Supabase Realtime 채널(live-status) 구독 및 상태 콜백/refresh 동기화
 * Author : 임도헌
 *
 * History
 * 2025.09.13  임도헌   Created   실시간 상태 반영(푸시 기반)
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.05.16  임도헌   Modified  live-status payload 타입을 명시해 any 캐스팅 제거
 * 2026.05.17  임도헌   Modified  상세 화면 상태 동기화 콜백을 추가해 live-status 구독 지점을 셸로 단일화
 */
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getRealtimeClientToken } from "@/features/stream/utils/clientToken";
import type { StreamRealtimeStatusPayload } from "@/features/stream/types";

interface Props {
  /** 동일 탭에서 내가 보낸 이벤트는 새로고침 생략 */
  ignoreSelf?: boolean;
  /** (선택) 최소 새로고침 간격(ms). 디폴트 250ms 디바운스 + 가시성 휴면 */
  minIntervalMs?: number;
  /** 특정 방송 상세에서만 상태 콜백을 받을 때 사용하는 Cloudflare stream uid */
  streamId?: string;
  /** 특정 방송 상태 변경을 부모 로컬 상태에 반영하기 위한 콜백 */
  onStatus?: (payload: StreamRealtimeStatusPayload) => void;
}

/**
 * 전역적인 방송 상태 변경 이벤트를 구독하여 페이지를 새로고침(refresh)하는 컴포넌트
 * - 주로 목록 페이지나 상세 페이지 상단에 배치하여 실시간성을 보장
 * - `live-status` 채널을 구독
 * - 상세 셸에서는 `streamId`와 `onStatus`로 로컬 상태를 먼저 동기화
 * - 디바운스 및 가시성 체크를 통해 불필요한 새로고침을 방지
 */
export default function LiveStatusRealtimeSubscriber({
  ignoreSelf = true,
  minIntervalMs = 250,
  streamId,
  onStatus,
}: Props) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selfTokenRef = useRef<string>(getRealtimeClientToken());
  const pendingVisibilityRefreshRef = useRef<boolean>(false);

  useEffect(() => {
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

    const channel = supabase.channel("live-status");

    channel.on("broadcast", { event: "status" }, (msg) => {
      const payload = (msg as { payload?: StreamRealtimeStatusPayload })
        .payload;
      // 서버 payload 예시: { streamId, status, ownerId, token?, ts }
      if (
        ignoreSelf &&
        payload?.token &&
        payload.token === selfTokenRef.current
      ) {
        return;
      }

      if (payload && streamId && payload.streamId === streamId) {
        onStatus?.(payload);
      }

      debouncedRefresh();
    });

    channel.subscribe();

    return () => {
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
  }, [router, ignoreSelf, minIntervalMs, streamId, onStatus]);

  return null;
}
