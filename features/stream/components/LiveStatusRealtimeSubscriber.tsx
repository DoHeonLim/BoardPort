/**
 * File Name : features/stream/components/LiveStatusRealtimeSubscriber.tsx
 * Description : Supabase Realtime 채널(live-status) 구독 → 상태 수신 시 디바운스된 router.refresh()
 * Author : 임도헌
 *
 * History
 * 2025.09.13  임도헌   Created   실시간 상태 반영(푸시 기반)
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 */
"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getRealtimeClientToken } from "@/features/stream/lib/getRealtimeClientToken";
import { useRouter } from "next/navigation";

interface Props {
  /** 동일 탭에서 내가 보낸 이벤트는 새로고침 생략 */
  ignoreSelf?: boolean;
  /** (선택) 최소 새로고침 간격(ms). 디폴트 250ms 디바운스 + 가시성 휴면 */
  minIntervalMs?: number;
}

export default function LiveStatusRealtimeSubscriber({
  ignoreSelf = true,
  minIntervalMs = 250,
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
      const payload = (msg as any)?.payload || {};
      // 서버 payload 예시: { streamId, status, ownerId, token?, ts }
      if (
        ignoreSelf &&
        payload?.token &&
        payload.token === selfTokenRef.current
      ) {
        return;
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
  }, [router, ignoreSelf, minIntervalMs]);

  return null;
}
