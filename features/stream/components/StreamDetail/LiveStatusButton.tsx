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
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.14  임도헌   Modified  방송 상태 배지의 직접색을 시맨틱 토큰 기준으로 재정렬
 * 2026.03.19  임도헌   Modified  스트림 상세 메타 바에 맞춰 block 상태 바를 짧은 inline 칩 구조로 재정리
 * 2026.03.19  임도헌   Modified  플레이어 상단 메타 바에 맞춰 패딩/그림자를 더 낮춘 경량 상태 칩으로 조정
 * 2026.03.20  임도헌   Modified  플레이어 상태 메타를 항해 로그 칩처럼 읽히도록 타이포와 대비를 추가 정리
 * 2026.03.20  임도헌   Modified  방송 종료 상태는 danger 계열 칩으로 조정해 라이브 종료 의미를 더 분명하게 전달
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { StreamStatus } from "@/features/stream/types";
import { cn } from "@/lib/utils";

/**
 * 방송 상태(CONNECTED/ENDED/DISCONNECTED)를 표시하는 뱃지
 *
 * [기능]
 * - 초기값은 SSR로 받지만, 이후 `live-status` 채널 이벤트를 통해 실시간으로 상태를 갱신
 * - 상태에 따라 색상과 텍스트를 변경
 */
export default function LiveStatusButton({
  status,
  streamId, // CF Live Input UID (provider_uid)
  className = "",
}: {
  status: StreamStatus | string;
  streamId: string;
  className?: string;
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
  const isEnded = current === "ENDED";
  const label =
    current === "CONNECTED"
      ? "방송 중"
      : current === "ENDED"
        ? "방송 종료"
        : current === "DISCONNECTED"
          ? "방송 대기"
          : "상태 확인중";

  const colorClass = isLive
    ? "bg-brand text-white dark:bg-brand-light"
    : isEnded
      ? "border border-danger/20 bg-danger/10 text-danger dark:border-danger/30 dark:bg-danger/15 dark:text-danger"
      : "border border-border-subtle bg-surface text-muted";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex h-8 w-fit items-center justify-center rounded-full px-3 text-[12px] font-semibold tracking-[0.01em]",
        colorClass,
        className
      )}
      data-stream-id={streamId}
      title={label}
    >
      {isLive && (
        <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white align-middle" />
      )}
      {label}
    </div>
  );
}
