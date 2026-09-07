/**
 * File Name : features/realtime/service/broadcast.ts
 * Description : Supabase Realtime private Broadcast 서버 전용 발신 경계
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   secret key 기반 REST 발신과 비치명적 실패 처리 추가
 * 2026.08.21  임도헌   Modified  opaque secret key를 JWT Authorization 헤더로 오용하지 않도록 보정
 */

import "server-only";

interface BroadcastMessage {
  type: "broadcast";
  event: string;
  payload: unknown;
}

/** 서버 전용 Realtime REST 발신에 필요한 URL과 secret key를 읽는다. */
function getServerRealtimeConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) return null;
  return { url, secretKey };
}

/** private=true가 강제된 Supabase Realtime Broadcast를 비치명적으로 전송한다. */
export async function sendPrivateRealtimeBroadcast(
  topic: string,
  message: BroadcastMessage
) {
  const config = getServerRealtimeConfig();
  if (!config) {
    console.warn(
      "[Realtime] Server broadcast skipped: Supabase server config is missing"
    );
    return false;
  }
  if (!topic || topic.length > 200 || !message.event) {
    console.warn("[Realtime] Server broadcast skipped: invalid topic or event");
    return false;
  }

  try {
    const response = await fetch(`${config.url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: config.secretKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            topic,
            event: message.event,
            payload: message.payload,
            private: true,
          },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.warn(
        `[Realtime] Server broadcast failed with status ${response.status}`
      );
      return false;
    }
    return true;
  } catch (error) {
    const reason = error instanceof Error ? error.name : "UnknownError";
    console.warn(`[Realtime] Server broadcast failed: ${reason}`);
    return false;
  }
}

/**
 * 기존 Supabase channel.send 호출부를 작은 변경으로 서버 전용 경계에 이관한다.
 * 브라우저 SDK 객체를 만들지 않으며 모든 메시지는 private=true로만 전송한다.
 */
export const realtimeServer = {
  channel(topic: string) {
    return {
      send(message: BroadcastMessage) {
        return sendPrivateRealtimeBroadcast(topic, message);
      },
    };
  },
};
