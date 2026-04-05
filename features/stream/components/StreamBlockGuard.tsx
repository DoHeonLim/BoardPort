/**
 * File Name : features/stream/components/StreamBlockGuard.tsx
 * Description : 실시간 차단/강제 퇴장 감지 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.05  임도헌   Created   실시간 차단(BLOCK) 이벤트 수신 시 리다이렉트 처리
 * 2026.03.18  임도헌   Modified  403 이동 시 pathname뿐 아니라 search까지 포함해 현재 복귀 문맥 보존
 * 2026.04.03  임도헌   Modified  방송 전용 강제 퇴장(STREAM_KICK) 이벤트를 분리 처리
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
  streamId: number; // 현재 방송 ID
}

/**
 * 실시간 차단 방어막
 * - 현재 시청 중인 방송의 주인이 나를 차단하는 'sys_event'를 수신하면
 * - 즉시 안내 메시지를 띄우고 접근 거부 페이지로 이동
 * - 현재 URL의 search까지 callbackUrl로 넘겨 복귀 문맥 보존
 */
export default function StreamBlockGuard({
  viewerId,
  ownerId,
  ownerUsername,
  streamId,
}: StreamBlockGuardProps) {
  const router = useRouter();

  useEffect(() => {
    // 비로그인이거나 본인이면 감시할 필요 없음
    if (!viewerId || viewerId === ownerId) return;

    const channelName = `user-${viewerId}-notifications`;
    const channel = supabase.channel(channelName);

    channel
      .on("broadcast", { event: "sys_event" }, ({ payload }) => {
        // payload:
        // - { type: "BLOCK", actorId: number, ... }
        // - { type: "STREAM_KICK", actorId: number, streamId: number, ... }

        if (payload?.type === "BLOCK" && payload.actorId === ownerId) {
          // 1. 토스트 알림 (즉각 피드백)
          toast.error(`${ownerUsername}님에게 차단되어 퇴장됩니다.`, {
            duration: 5000,
          });

          // 2. 강제 이동 (403 페이지)
          // 현재 쿼리까지 함께 넘겨 차단 해제/복귀 시 문맥 보존
          const currentUrl =
            window.location.pathname + window.location.search;
          router.replace(
            `/403?reason=BLOCKED&username=${encodeURIComponent(
              ownerUsername
            )}&callbackUrl=${encodeURIComponent(currentUrl)}`
          );
          return;
        }

        if (
          payload?.type === "STREAM_KICK" &&
          payload.actorId === ownerId &&
          Number(payload.streamId) === streamId
        ) {
          toast.error(`${ownerUsername}님의 방송에서 강제 퇴장되었습니다.`, {
            duration: 5000,
          });
          router.replace("/streams");
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewerId, ownerId, ownerUsername, router, streamId]);

  return null; // UI 없음 (Logic Only)
}
