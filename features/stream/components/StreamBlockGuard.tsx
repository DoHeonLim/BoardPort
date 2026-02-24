/**
 * File Name : features/stream/components/StreamBlockGuard.tsx
 * Description : 실시간 차단 감지 및 강제 퇴장 처리 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.05  임도헌   Created   실시간 차단(BLOCK) 이벤트 수신 시 리다이렉트 처리
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface StreamBlockGuardProps {
  viewerId: number | null; // 현재 로그인한 내 ID
  ownerId: number; // 방송 주인(스트리머) ID
  ownerUsername: string; // 안내 메시지용
}

/**
 * 실시간 차단 방어막
 * - 현재 시청 중인 방송의 주인이 나를 차단하는 'sys_event'를 수신하면
 * - 즉시 안내 메시지를 띄우고 접근 거부 페이지로 이동
 */
export default function StreamBlockGuard({
  viewerId,
  ownerId,
  ownerUsername,
}: StreamBlockGuardProps) {
  const router = useRouter();

  useEffect(() => {
    // 비로그인이거나 본인이면 감시할 필요 없음
    if (!viewerId || viewerId === ownerId) return;

    const channelName = `user-${viewerId}-notifications`;
    const channel = supabase.channel(channelName);

    channel
      .on("broadcast", { event: "sys_event" }, ({ payload }) => {
        // payload: { type: "BLOCK", actorId: number, ... }

        if (payload?.type === "BLOCK" && payload.actorId === ownerId) {
          // 1. 토스트 알림 (즉각 피드백)
          toast.error(`${ownerUsername}님에게 차단되어 퇴장됩니다.`, {
            duration: 5000,
          });

          // 2. 강제 이동 (403 페이지)
          const currentUrl = window.location.pathname;
          router.replace(
            `/403?reason=BLOCKED&username=${encodeURIComponent(
              ownerUsername
            )}&callbackUrl=${encodeURIComponent(currentUrl)}`
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewerId, ownerId, ownerUsername, router]);

  return null; // UI 없음 (Logic Only)
}
