/**
 * File Name : features/stream/lib/createStreamChatRoom.ts
 * Description : 방송(Broadcast) 1:1 스트리밍 채팅방 생성 유틸 (idempotent)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.30  임도헌   Created   스트리밍 생성 시 채팅방 연결 기능 분리
 * 2025.09.16  임도헌   Modified  LiveStream → Broadcast 기준으로 변경, upsert/idempotent, @unique(broadcastId) 전제
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 * 2026.01.19  임도헌   Moved     features/chat/lib -> features/stream/lib
 */

import db from "@/lib/db";
import { isUniqueConstraintError } from "@/lib/errors";

/**
 * createStreamChatRoom
 * - Broadcast와 1:1로 연결된 채팅방 생성 (이미 있으면 재사용)
 * - 스키마 전제: StreamChatRoom.broadcastId 에 @unique
 */
export const createStreamChatRoom = async (broadcastId: number) => {
  try {
    const room = await db.streamChatRoom.upsert({
      where: { broadcastId },
      update: {},
      create: {
        broadcast: { connect: { id: broadcastId } },
      },
      select: { id: true },
    });

    return { success: true as const, id: room.id };
  } catch (e: any) {
    const maybeUnique =
      isUniqueConstraintError(e, ["broadcastId"]) ||
      e?.message?.includes("Unique");

    if (maybeUnique) {
      try {
        const existing = await db.streamChatRoom.findUnique({
          where: { broadcastId },
          select: { id: true },
        });
        if (existing) return { success: true as const, id: existing.id };

        const created = await db.streamChatRoom.create({
          data: { broadcast: { connect: { id: broadcastId } } },
          select: { id: true },
        });
        return { success: true as const, id: created.id };
      } catch (err) {
        console.error("[createStreamChatRoom][fallback] failed:", err);
        return {
          success: false as const,
          error: "채팅방 생성에 실패했습니다.",
        };
      }
    }

    console.error("[createStreamChatRoom] failed:", e);
    return { success: false as const, error: "채팅방 생성에 실패했습니다." };
  }
};
