/**
 * File Name : features/stream/components/StreamDetail/LiveStatusButton.tsx
 * Description : 라이브 상태 버튼
 * Author : 임도헌
 *
 * History
 * 2024.11.19  임도헌   Created
 * 2024.11.19  임도헌   Modified  라이브 상태 버튼
 * 2025.05.16  임도헌   Modified  주기적인 업데이트로 변경
 * 2025.07.24  임도헌   Modified  console.log 제거
 * 2025.08.14  임도헌   Modified  서버 전용 함수 직접 호출 제거 → API 폴링
 * 2025.08.23  임도헌   Modified  폴링 안정화: 지수 백오프 유틸(lib/utils/backoff)로 분리, 비가시성 휴면/지터
 * 2025.09.09  임도헌   Modified  a11y(role=status), prop→state 동기화, JSON 가드
 * 2025.09.14  임도헌   Modified  상태 변경 시 live-status 브로드캐스트 추가 (Supabase
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 및 디자인 통일)
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { StreamStatus } from "@/types/stream";
import { cn } from "@/lib/utils";

export default function LiveStatusButton({
  status,
  streamId, // CF Live Input UID (provider_uid)
}: {
  status: StreamStatus | string;
  streamId: string;
}) {
  // SSR 초기값 → 이후엔 실시간 이벤트로만 갱신
  const [current, setCurrent] = useState<StreamStatus>(
    (status?.toUpperCase?.() as StreamStatus) || "DISCONNECTED"
  );
  const mountedRef = useRef(true);

  // prop 변경 시 동기화
  useEffect(() => {
    const next = (status?.toUpperCase?.() as StreamStatus) || "DISCONNECTED";
    setCurrent((prev) => (prev === next ? prev : next));
  }, [status]);

  useEffect(() => {
    mountedRef.current = true;
    // live-status 채널 구독: 서버에서 브로드캐스트(push)
    const channel = supabase.channel("live-status");

    channel.on("broadcast", { event: "status" }, (msg) => {
      const payload = (msg as any)?.payload || {};

      if (!payload?.streamId || payload.streamId !== streamId) return;

      const next = String(payload.status || "").toUpperCase() as StreamStatus;
      if (!mountedRef.current) return;

      setCurrent((prev) => (prev === next ? prev : next));
    });

    channel.subscribe();

    return () => {
      mountedRef.current = false;
      try {
        channel.unsubscribe();
      } catch {}
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [streamId]);

  const isLive = current === "CONNECTED";
  const label =
    current === "CONNECTED"
      ? "방송 중"
      : current === "ENDED"
        ? "방송 종료"
        : current === "DISCONNECTED"
          ? "방송 대기"
          : "상태 확인중";

  const colorClass = isLive
    ? "bg-indigo-500 text-white"
    : "bg-red-500 text-white"; // 종료/대기 등은 빨강

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "m-2 flex h-8 w-24 items-center justify-center rounded-md font-semibold text-sm shadow-sm",
        colorClass
      )}
      data-stream-id={streamId}
      title={label}
    >
      {isLive && (
        <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-white align-middle" />
      )}
      {label}
    </div>
  );
}
