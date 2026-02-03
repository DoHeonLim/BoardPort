/**
 * File Name : features/stream/service/realtime.ts
 * Description : 서버 사이드 실시간 상태 브로드캐스트 (Supabase)
 *
 * History
 * Date        Author   Status    Description
 * 2025.09.14  임도헌   Created
 * 2026.01.18  임도헌   Modifeid  확장자 변경 (tsx->ts)
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 * 2026.01.23  임도헌   Moved     lib/stream/serverBroadcast -> service/realtime
 * 2026.01.28  임도헌   Modified  주석 보강
 */

import "server-only";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

let channel: RealtimeChannel | null = null;
let subscribed = false;
let subscribingPromise: Promise<void> | null = null;

// 채널 구독 보장 헬퍼
async function ensureChannel(): Promise<RealtimeChannel> {
  if (!channel) {
    channel = supabase.channel("live-status");
  }
  if (!subscribed) {
    if (!subscribingPromise) {
      subscribingPromise = new Promise<void>((resolve) => {
        channel!.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            subscribed = true;
            resolve();
          }
        });
      });
    }
    await subscribingPromise;
  }
  return channel!;
}

/**
 * 방송 상태 변경을 클라이언트들에게 실시간으로 알립니다.
 *
 * @param payload - 상태 정보 (streamId, status, ownerId 등)
 */
export async function sendLiveStatusFromServer(payload: {
  streamId: string;
  status: "CONNECTED" | "READY" | "ENDED" | "DISCONNECTED" | string;
  ownerId: number;
}) {
  const ch = await ensureChannel();
  try {
    await ch.send({
      type: "broadcast",
      event: "status",
      payload: {
        ...payload,
        token: "server", // 서버 발신임을 표시
        ts: Date.now(),
      },
    });
  } catch {
    // 실시간 전송 실패는 치명적이지 않음
  }
}
