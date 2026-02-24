/**
 * File Name : features/stream/actions/chat.ts
 * Description : 스트리밍 채팅 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   created   app/streams/[id]/actions.ts (sendStreamMessageAction) -> features/stream/actions/chat.ts
 * 2026.02.05  임도헌   Modified  메시지 전송 시 스트리머와의 차단 관계 확인 로직 추가
 */

"use server";

import getSession from "@/lib/session";
import db from "@/lib/db";
import { createStreamMessage } from "@/features/stream/service/chat";
import { checkBlockRelation } from "@/features/user/service/block";
import type { SendStreamMessageResult } from "@/features/stream/types";

/**
 * 스트리밍 채팅 메시지 전송 Action
 * - 로그인 확인 및 Rate Limit 체크 후 메시지를 전송
 * - 성공 시 브로드캐스트된 메시지 객체를 반환
 */
export const sendStreamMessageAction = async (
  payload: string,
  streamChatRoomId: number
): Promise<SendStreamMessageResult> => {
  try {
    const session = await getSession();
    if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" };

    const text = (payload ?? "").trim();
    if (!text) return { success: false, error: "EMPTY_MESSAGE" };
    if (text.length > 2000)
      return { success: false, error: "MESSAGE_TOO_LONG" };

    // 스트리밍 방 정보 및 호스트 조회
    const room = await db.streamChatRoom.findUnique({
      where: { id: streamChatRoomId },
      select: {
        broadcast: {
          select: { liveInput: { select: { userId: true } } },
        },
      },
    });

    if (!room || !room.broadcast) {
      return { success: false, error: "CREATE_FAILED" };
    }

    const hostId = room.broadcast.liveInput.userId;

    // 차단 관계 확인
    // 내가 호스트를 차단했거나, 호스트가 나를 차단했으면 전송 불가
    if (session.id !== hostId) {
      const isBlocked = await checkBlockRelation(session.id, hostId);
      if (isBlocked) {
        // RATE_LIMITED 등 적절한 에러 코드로 리턴하거나 커스텀 에러 처리
        // 여기서는 생성 실패로 처리
        return { success: false, error: "CREATE_FAILED" };
      }
    }

    // Rate Limit (10초당 10개)
    const WINDOW_MS = 10_000;
    const MAX_PER_WINDOW = 10;
    const since = new Date(Date.now() - WINDOW_MS);
    const recentCount = await db.streamMessage.count({
      where: {
        userId: session.id,
        streamChatRoomId,
        created_at: { gte: since },
      },
    });

    if (recentCount >= MAX_PER_WINDOW) {
      return { success: false, error: "RATE_LIMITED" };
    }

    const result = await createStreamMessage(
      text,
      streamChatRoomId,
      session.id
    );

    if (!result.success) return { success: false, error: "CREATE_FAILED" };

    return { success: true, message: result.message };
  } catch (e) {
    console.error("[sendStreamMessageAction] error:", e);
    return { success: false, error: "CREATE_FAILED" };
  }
};
