/**
 * File Name : components/stream/StreamDetail/LiveViewerCount
 * Description : 실시간 시청자 수 표시 컴포넌트 (Supabase Presence 전용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.19  임도헌   Created
 * 2025.05.19  임도헌   Modified  Supabase Presence 기반으로 기능 추가
 * 2025.08.23  임도헌   Modified  Presence 정리 보강(untrack/removeChannel),
 *                                mounted 가드 적용
 * 2025.09.09  임도헌   Modified  join/leave 이벤트 반영, pagehide/visibility 이탈 처리,
 *                                중복 정리 가드(once), beforeunload await 제거
 * 2025.09.17  임도헌   Modified  join/leave API 호출 제거(완전 Presence 전용)
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

interface LiveViewerCountProps {
  streamId: number;
  me: number;
  className?: string;
}

export default function LiveViewerCount({
  streamId,
  me,
  className = "",
}: LiveViewerCountProps) {
  const [viewerCount, setViewerCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const cleanedRef = useRef(false);

  useEffect(() => {
    if (!me) return;
    cleanedRef.current = false;

    const channel = supabase.channel(`presence:livestream:${streamId}`, {
      config: { presence: { key: `viewer-${me}` } },
    });
    channelRef.current = channel;

    const recalc = () => {
      const state = channel.presenceState() as Record<string, unknown>;
      setViewerCount(Object.keys(state || {}).length);
    };

    channel
      .on("presence", { event: "sync" }, recalc)
      .on("presence", { event: "join" }, recalc)
      .on("presence", { event: "leave" }, recalc);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await channel.track({ user_id: me });
        } catch {}
        recalc();
      }
    });

    const leaveOnce = () => {
      if (cleanedRef.current) return;
      cleanedRef.current = true;
      channel.untrack().catch(() => {});
      channel.unsubscribe().catch(() => {});
      supabase.removeChannel(channel);
    };

    const onPageHide = () => leaveOnce();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") leaveOnce();
    };
    const onBeforeUnload = () => leaveOnce();

    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      leaveOnce();
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [streamId, me]);

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      aria-live="polite"
    >
      <div className="relative flex h-2.5 w-2.5" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
      </div>
      <span className="text-sm font-bold text-white drop-shadow-md">
        {viewerCount}명 시청 중
      </span>
    </div>
  );
}
