/**
 * File Name : features/stream/lib/getStreamKey.ts
 * Description : 방송 소유자 전용 RTMP 송출 키 조회 액션 (RTMP URL 동반 반환)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.09.16  임도헌   Created   서버 액션 생성: getStreamKey(broadcastId) → { rtmpUrl, streamKey }
 * 2025.09.16  임도헌   Modified  StreamSecretInfo.fetchCreds 형식에 맞춰 rtmpUrl 동반 반환, 가드/에러 코드 정리
 * 2026.01.18  임도헌   Modifeid  확장자 변경 (tsx->ts)
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 */

"use server";

import db from "@/lib/db";
import getSession from "@/lib/session";

/** RTMP 기본 엔드포인트(ENV 우선, 없으면 CF 기본값) */
const DEFAULT_RTMPS_URL =
  process.env.NEXT_PUBLIC_CLOUDFLARE_RTMP_URL?.trim() ||
  "rtmps://live.cloudflare.com:443/live/";

/** 액션 반환 타입 (UI 기대 형식) */
type Result =
  | { success: true; rtmpUrl: string; streamKey: string }
  | { success: false; error: "NOT_LOGGED_IN" | "NOT_FOUND" | "FORBIDDEN" };

/**
 * getStreamKey
 * - 방송(Broadcast)의 소유자만 LiveInput의 stream_key를 조회합니다.
 * - 성공 시 RTMP URL과 Secret Key를 함께 반환합니다.
 *
 * 가드:
 *  - 로그인 필요 (NOT_LOGGED_IN)
 *  - broadcastId 유효성 및 존재 여부 확인 (NOT_FOUND)
 *  - 요청자 소유자 여부 확인 (FORBIDDEN)
 *
 * @param broadcastId 조회할 방송(Broadcast) ID
 * @returns {Result} 성공 시 { rtmpUrl, streamKey }
 */
export async function getStreamKey(broadcastId: number): Promise<Result> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" };

  if (!Number.isFinite(broadcastId)) {
    return { success: false, error: "NOT_FOUND" };
  }

  try {
    // Broadcast → LiveInput(userId, stream_key) 조회
    const b = await db.broadcast.findUnique({
      where: { id: broadcastId },
      select: {
        liveInput: {
          select: {
            userId: true,
            stream_key: true, // 민감정보: 소유자만 반환
          },
        },
      },
    });

    if (!b?.liveInput) return { success: false, error: "NOT_FOUND" };
    if (b.liveInput.userId !== session.id)
      return { success: false, error: "FORBIDDEN" };

    return {
      success: true,
      rtmpUrl: DEFAULT_RTMPS_URL,
      streamKey: b.liveInput.stream_key,
    };
  } catch (e) {
    console.error("[getStreamKey] failed:", e);
    // 상세 에러는 노출하지 않고 NOT_FOUND로 통일
    return { success: false, error: "NOT_FOUND" };
  }
}
