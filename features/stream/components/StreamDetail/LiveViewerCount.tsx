/**
 * File Name : features/stream/components/StreamDetail/LiveViewerCount.tsx
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
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.19  임도헌   Modified  self track 직후 최소 1명 보정과 hidden 해제 예외 제거로 상세 메타 바 시청자 수 안정성 보강
 * 2026.03.19  임도헌   Modified  self track 직후 sync 지연에도 최소 1명은 유지되도록 presence 집계 보정
 * 2026.03.19  임도헌   Modified  현재 시청자가 존재하는 상세 화면에서는 표시값이 0으로 내려가지 않도록 최소값 보정
 * 2026.03.20  임도헌   Modified  상태 칩과 맞는 메타 리듬으로 조정해 시청자 수가 플레이어 상단 보조 정보처럼 읽히도록 정리
 * 2026.03.20  임도헌   Modified  상태 칩과 높이/대비를 다시 맞춰 시청자 수 메타가 한 줄 정보처럼 더 차분하게 읽히도록 조정
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface LiveViewerCountProps {
  streamId: number;
  me: number;
  className?: string;
}

/**
 * 실시간 시청자 수를 표시하는 컴포넌트
 *
 * [기능]
 * - Supabase Presence를 사용하여 현재 방에 접속한 사용자 수를 실시간으로 집계
 * - `join`, `leave`, `sync` 이벤트를 구독하여 카운트를 갱신
 * - 페이지 이탈 시 `untrack` 및 구독 해제를 수행
 */
export default function LiveViewerCount({
  streamId,
  me,
  className = "",
}: LiveViewerCountProps) {
  const [viewerCount, setViewerCount] = useState(0);
  const cleanedRef = useRef(false);
  const trackedSelfRef = useRef(false);
  const displayCount = me ? Math.max(viewerCount, 1) : viewerCount;

  useEffect(() => {
    if (!me) return;
    cleanedRef.current = false;
    trackedSelfRef.current = false;

    const channel = supabase.channel(`presence:livestream:${streamId}`, {
      config: { presence: { key: `viewer-${me}` } },
    });
    const recalc = () => {
      const state = channel.presenceState() as Record<string, unknown>;
      const nextCount = Object.keys(state || {}).length;
      // sync 이벤트가 자기 presence 반영보다 빨라도 현재 시청자는 최소 1명으로 유지
      setViewerCount(trackedSelfRef.current ? Math.max(nextCount, 1) : nextCount);
    };

    channel
      .on("presence", { event: "sync" }, recalc)
      .on("presence", { event: "join" }, recalc)
      .on("presence", { event: "leave" }, recalc);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await channel.track({ user_id: me });
          trackedSelfRef.current = true;
        } catch {}
        // 현재 시청자 자신은 최소 1명으로 보이도록 1차 보정
        setViewerCount((prev) => Math.max(prev, 1));
        recalc();
      }
    });

    const leaveOnce = () => {
      if (cleanedRef.current) return;
      cleanedRef.current = true;
      trackedSelfRef.current = false;
      channel.untrack().catch(() => {});
      channel.unsubscribe().catch(() => {});
      supabase.removeChannel(channel);
    };

    const onPageHide = () => leaveOnce();
    const onBeforeUnload = () => leaveOnce();

    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      leaveOnce();
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [streamId, me]);

  return (
    <div
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-full border border-border-subtle bg-surface px-3 text-[13px] shadow-sm",
        className
      )}
      aria-live="polite"
    >
      <div className="relative flex h-2.5 w-2.5" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
      </div>
      <span className="font-semibold tracking-[0.01em] text-primary/85">
        {displayCount}명 시청 중
      </span>
    </div>
  );
}
