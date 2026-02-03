/**
 * File Name : features/stream/actions/chat.ts
 * Description : 스트리밍 채팅 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   created   app/streams/[id]/actions.ts (sendStreamMessageAction) -> features/stream/actions/chat.ts
 */

"use server";

import getSession from "@/lib/session";
import db from "@/lib/db";
import { createStreamMessage } from "@/features/stream/service/chat";
import type { SendStreamMessageResult } from "@/features/stream/types";

/**
 * 스트리밍 채팅 메시지 전송 Action
 * - 로그인 확인 및 Rate Limit 체크 후 메시지를 전송합니다.
 * - 성공 시 브로드캐스트된 메시지 객체를 반환합니다.
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
