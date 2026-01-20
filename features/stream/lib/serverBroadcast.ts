/**
 * File Name : features/stream/lib/serverBroadcast.ts
 * Description : 서버 사이드에서 Supabase Realtime 브로드캐스트 전송
 *
 * History
 * Date        Author   Status    Description
 * 2025.09.14  임도헌   Created
 * 2026.01.18  임도헌   Modifeid  확장자 변경 (tsx->ts)
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 */

import "server-only";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

let channel: RealtimeChannel | null = null;
let subscribed = false;
let subscribingPromise: Promise<void> | null = null;

/** 채널 준비 및 SUBSCRIBED 보장 */
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

/** 서버에서 라이브 상태 변경 브로드캐스트 */
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
        token: "server", // 클라이언트 ignoreSelf와 구분되는 고정 토큰
        ts: Date.now(),
      },
    });
  } catch {
    // 전송 실패는 치명적이지 않으므로 무시(필요시 로깅)
  }
}
