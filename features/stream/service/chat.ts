/**
 * File Name : features/stream/service/chat.ts
 * Description : 스트리밍 채팅방 및 메시지 관리 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.30  임도헌   Created   스트리밍 채팅 메시지 저장 기능 분리
 * 2025.08.23  임도헌   Modified  저장 후 브로드캐스트용 전체 메시지 객체 반환
 * 2025.09.09  임도헌   Modified  에러코드 정합성( CREATE_FAILED ) 통일
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 * 2026.01.19  임도헌   Moved     features/chat/lib -> features/stream/lib
 * 2026.01.23  임도헌   Merged    채팅방 생성/조회, 메시지 생성/조회 로직 통합 및 Session 분리
 * 2026.01.28  임도헌   Modified  주석 보강
 * 2026.02.07  임도헌   Modified  정지 유저 가드(validateUserStatus) 적용
 * 2026.03.07  임도헌   Modified  생성 실패 문구를 구체화(v1.2)
 * 2026.04.03  임도헌   Modified  호스트 전용 스트림 메시지 삭제 서비스 추가
 * 2026.04.03  임도헌   Modified  호스트 전용 스트림 시청자 강제 퇴장 서비스 추가
 * 2026.04.03  임도헌   Modified  방송 단위 채팅 금지 조회/토글 서비스 추가
 * 2026.04.03  임도헌   Modified  메시지 hard delete를 soft delete로 전환해 삭제 placeholder를 지원
 * 2026.04.03  임도헌   Modified  스트림 채팅 상단 고정 공지 등록/수정/해제 서비스 추가
 * 2026.04.03  임도헌   Modified  방송 단위 채팅 금지 대상 목록 조회 서비스 추가
 * 2026.04.07  임도헌   Modified  방송 제목/설명 수정 실시간 동기화 브로드캐스트 추가
 * 2026.05.16  임도헌   Modified  채팅방 생성 에러 분기를 unknown-safe 방식으로 정리
 * 2026.05.16  임도헌   Modified  메시지 전송 사전 조회/카운트 헬퍼를 서비스 계층으로 분리
 */

import "server-only";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { validateUserStatus } from "@/features/user/service/admin";
import { isUniqueConstraintError } from "@/lib/errors";
import type { StreamChatMessage } from "@/features/chat/types";

type StreamChatSendContext = {
  broadcastId: number;
  hostId: number;
};

/**
 * 방송(Broadcast) 전용 채팅방 생성
 * - 이미 존재하면 해당 방 ID를 반환 (Idempotent).
 * - 동시성 문제(Unique Constraint) 발생 시 조회 후 반환으로 fallback 처리
 *
 * @param {number} broadcastId - 방송 ID
 */
export async function createStreamChatRoom(broadcastId: number) {
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
  } catch (e: unknown) {
    const maybeUnique =
      isUniqueConstraintError(e, ["broadcastId"]) ||
      (e instanceof Error && e.message.includes("Unique"));

    if (maybeUnique) {
      try {
        const existing = await db.streamChatRoom.findUnique({
          where: { broadcastId },
          select: { id: true },
        });
        if (existing) return { success: true as const, id: existing.id };
      } catch (err) {
        console.error("[createStreamChatRoom][fallback] failed:", err);
      }
    }
    console.error("[createStreamChatRoom] failed:", e);
    return {
      success: false as const,
      error: "채팅방 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

/**
 * 방송 ID로 채팅방 정보 조회
 */
export const getStreamChatRoom = async (broadcastId: number) => {
  return await db.streamChatRoom.findUnique({
    where: { broadcastId },
    include: {
      broadcast: {
        select: {
          id: true,
          liveInput: { select: { userId: true } }, // host 식별용
        },
      },
    },
  });
};

/**
 * 메시지 전송 전 필요한 방송/호스트 컨텍스트 조회
 */
export async function getStreamChatSendContext(
  streamChatRoomId: number
): Promise<StreamChatSendContext | null> {
  const room = await db.streamChatRoom.findUnique({
    where: { id: streamChatRoomId },
    select: {
      broadcast: {
        select: {
          id: true,
          liveInput: { select: { userId: true } },
        },
      },
    },
  });

  if (!room?.broadcast) return null;

  return {
    broadcastId: room.broadcast.id,
    hostId: room.broadcast.liveInput.userId,
  };
}

/**
 * 특정 시청자의 최근 채팅 메시지 수 조회
 */
export async function countRecentStreamMessages(
  userId: number,
  streamChatRoomId: number,
  since: Date
) {
  return db.streamMessage.count({
    where: {
      userId,
      streamChatRoomId,
      created_at: { gte: since },
    },
  });
}

/**
 * 채팅 메시지 생성
 * - 작성자의 정지 여부를 확인
 * - 메시지를 DB에 저장하고, 브로드캐스트를 위해 완성된 메시지 객체를 반환
 *
 * @param {string} payload - 메시지 내용
 * @param {number} streamChatRoomId - 채팅방 ID
 * @param {number} userId - 작성자 ID
 */
export const createStreamMessage = async (
  payload: string,
  streamChatRoomId: number,
  userId: number
): Promise<
  | { success: true; message: StreamChatMessage }
  | { success: false; error: string }
> => {
  // 작성 가능 상태 확인
  const status = await validateUserStatus(userId);
  if (!status.success) return { success: false, error: "BANNED_USER" };

  try {
    const row = await db.streamMessage.create({
      data: { payload, streamChatRoomId, userId },
      select: {
        id: true,
        payload: true,
        deleted_at: true,
        created_at: true,
        streamChatRoomId: true,
        userId: true,
        user: { select: { username: true, avatar: true } },
      },
    });

    const message: StreamChatMessage = {
      id: row.id,
      payload: row.payload,
      deleted_at: row.deleted_at,
      created_at: row.created_at,
      streamChatRoomId: row.streamChatRoomId,
      userId: row.userId,
      user: {
        username: row.user?.username ?? "",
        avatar: row.user?.avatar ?? null,
      },
    };

    await supabase.channel(`room-${streamChatRoomId}`).send({
      type: "broadcast",
      event: "message",
      payload: message,
    });

    return { success: true, message };
  } catch (e) {
    console.error("[createStreamMessage] error:", e);
    return { success: false, error: "CREATE_FAILED" };
  }
};

/**
 * 초기 메시지 목록 조회
 * - 최근 N개의 메시지를 최신순(DESC)으로 조회한 뒤, 시간순(ASC)으로 반환
 *
 * @param {number} streamChatRoomId - 채팅방 ID
 * @param {number} take - 조회 개수 (Default: 20)
 */
export const getInitialStreamMessages = async (
  streamChatRoomId: number,
  take: number = 20
): Promise<StreamChatMessage[]> => {
  const rows = await db.streamMessage.findMany({
    where: { streamChatRoomId },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
  });
  return rows.reverse();
};

/**
 * 현재 방송에서 특정 시청자가 채팅 금지 상태인지 확인
 *
 * @param {number} broadcastId - 방송 ID
 * @param {number} userId - 조회 대상 유저 ID
 */
export const isStreamViewerMuted = async (
  broadcastId: number,
  userId: number
) => {
  const row = await db.streamChatMute.findUnique({
    where: {
      broadcastId_userId: {
        broadcastId,
        userId,
      },
    },
    select: { id: true },
  });

  return !!row;
};

/**
 * 방송 단위 채팅 금지 대상 유저 ID 목록 조회
 *
 * @param {number} broadcastId - 방송 ID
 */
export const getMutedStreamViewerIds = async (broadcastId: number) => {
  const rows = await db.streamChatMute.findMany({
    where: { broadcastId },
    select: { userId: true },
  });

  return rows.map((row) => row.userId);
};

/**
 * 방송 단위 채팅 금지 대상 시청자 목록 조회
 * - 현재 방송 호스트만 조회 가능
 * - 해제 패널에서 바로 사용할 수 있도록 닉네임/아바타를 함께 반환
 *
 * @param {number} broadcastId - 방송 ID
 * @param {number} userId - 요청 사용자 ID
 */
export const getMutedStreamViewers = async (
  broadcastId: number,
  userId: number
): Promise<
  | {
      success: true;
      viewers: { id: number; username: string; avatar: string | null }[];
    }
  | {
      success: false;
      error: "FORBIDDEN" | "NOT_FOUND" | "FETCH_FAILED";
    }
> => {
  try {
    const broadcast = await db.broadcast.findUnique({
      where: { id: broadcastId },
      select: {
        id: true,
        liveInput: { select: { userId: true } },
      },
    });

    if (!broadcast) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (broadcast.liveInput.userId !== userId) {
      return { success: false, error: "FORBIDDEN" };
    }

    const rows = await db.streamChatMute.findMany({
      where: { broadcastId },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      select: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return {
      success: true,
      viewers: rows.map((row) => ({
        id: row.user.id,
        username: row.user.username,
        avatar: row.user.avatar ?? null,
      })),
    };
  } catch (e) {
    console.error("[getMutedStreamViewers] error:", e);
    return { success: false, error: "FETCH_FAILED" };
  }
};

/**
 * 호스트 전용 채팅 메시지 삭제
 * - 현재 방송의 호스트만 해당 채팅방 메시지를 삭제할 수 있음
 * - 삭제 후에도 채팅 문맥을 유지할 수 있도록 soft delete로 전환
 *
 * @param {number} messageId - 삭제할 메시지 ID
 * @param {number} userId - 요청 사용자 ID
 */
export const deleteStreamMessage = async (
  messageId: number,
  userId: number
): Promise<
  | { success: true; messageId: number; deleted_at: string }
  | {
      success: false;
      error: "FORBIDDEN" | "NOT_FOUND" | "DELETE_FAILED";
    }
> => {
  try {
    const existing = await db.streamMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        deleted_at: true,
        stream_chat_room: {
          select: {
            id: true,
            broadcast: {
              select: {
                liveInput: {
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!existing) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (existing.deleted_at) {
      return {
        success: true,
        messageId: existing.id,
        deleted_at: existing.deleted_at.toISOString(),
      };
    }

    const hostId = existing.stream_chat_room.broadcast.liveInput.userId;
    if (hostId !== userId) {
      return { success: false, error: "FORBIDDEN" };
    }

    const deleted = await db.streamMessage.update({
      where: { id: messageId },
      data: { deleted_at: new Date() },
      select: {
        id: true,
        deleted_at: true,
      },
    });

    await supabase.channel(`room-${existing.stream_chat_room.id}`).send({
      type: "broadcast",
      event: "message_deleted",
      payload: {
        messageId: deleted.id,
        deleted_at: deleted.deleted_at!.toISOString(),
      },
    });

    return {
      success: true,
      messageId: deleted.id,
      deleted_at: deleted.deleted_at!.toISOString(),
    };
  } catch (e) {
    console.error("[deleteStreamMessage] error:", e);
    return { success: false, error: "DELETE_FAILED" };
  }
};

/**
 * 호스트 전용 시청자 강제 퇴장
 * - 전역 차단과 달리 현재 방송 세션에서만 즉시 이탈시키는 운영 액션
 * - 대상 유저의 개인 알림 채널로 스트림 전용 sys_event를 전송
 *
 * @param {number} broadcastId - 방송 ID
 * @param {number} targetId - 강제 퇴장 대상 유저 ID
 * @param {number} userId - 요청 사용자 ID
 */
export const kickStreamViewer = async (
  broadcastId: number,
  targetId: number,
  userId: number
): Promise<
  | { success: true; targetId: number }
  | {
      success: false;
      error: "FORBIDDEN" | "NOT_FOUND" | "KICK_FAILED";
    }
> => {
  try {
    const broadcast = await db.broadcast.findUnique({
      where: { id: broadcastId },
      select: {
        id: true,
        liveInput: { select: { userId: true } },
      },
    });

    if (!broadcast) {
      return { success: false, error: "NOT_FOUND" };
    }

    const hostId = broadcast.liveInput.userId;
    if (hostId !== userId || targetId === hostId) {
      return { success: false, error: "FORBIDDEN" };
    }

    await supabase.channel(`user-${targetId}-notifications`).send({
      type: "broadcast",
      event: "sys_event",
      payload: {
        type: "STREAM_KICK",
        actorId: userId,
        streamId: broadcastId,
        timestamp: Date.now(),
      },
    });

    return { success: true, targetId };
  } catch (e) {
    console.error("[kickStreamViewer] error:", e);
    return { success: false, error: "KICK_FAILED" };
  }
};

/**
 * 호스트 전용 채팅 금지 토글
 * - 방송 단위로만 적용되며 시청 자체는 허용하고 채팅 전송만 막음
 * - 토글 결과를 대상 유저 개인 채널에 실시간 전송해 입력창 상태를 즉시 동기화
 *
 * @param {number} broadcastId - 방송 ID
 * @param {number} targetId - 채팅 금지 대상 유저 ID
 * @param {number} userId - 요청 사용자 ID
 * @param {"mute" | "unmute"} intent - 실행 의도
 */
export const toggleStreamChatMute = async (
  broadcastId: number,
  targetId: number,
  userId: number,
  intent: "mute" | "unmute"
): Promise<
  | { success: true; targetId: number; muted: boolean }
  | {
      success: false;
      error: "FORBIDDEN" | "NOT_FOUND" | "MUTE_FAILED";
    }
> => {
  try {
    const broadcast = await db.broadcast.findUnique({
      where: { id: broadcastId },
      select: {
        id: true,
        liveInput: { select: { userId: true } },
      },
    });

    if (!broadcast) {
      return { success: false, error: "NOT_FOUND" };
    }

    const hostId = broadcast.liveInput.userId;
    if (hostId !== userId || targetId === hostId) {
      return { success: false, error: "FORBIDDEN" };
    }

    if (intent === "mute") {
      await db.streamChatMute.upsert({
        where: {
          broadcastId_userId: {
            broadcastId,
            userId: targetId,
          },
        },
        create: {
          broadcastId,
          userId: targetId,
          mutedById: userId,
        },
        update: {
          mutedById: userId,
        },
      });
    } else {
      await db.streamChatMute.deleteMany({
        where: {
          broadcastId,
          userId: targetId,
        },
      });
    }

    await supabase.channel(`user-${targetId}-notifications`).send({
      type: "broadcast",
      event: "sys_event",
      payload: {
        type: intent === "mute" ? "STREAM_CHAT_MUTED" : "STREAM_CHAT_UNMUTED",
        actorId: userId,
        streamId: broadcastId,
        timestamp: Date.now(),
      },
    });

    return { success: true, targetId, muted: intent === "mute" };
  } catch (e) {
    console.error("[toggleStreamChatMute] error:", e);
    return { success: false, error: "MUTE_FAILED" };
  }
};

/**
 * 호스트 전용 스트림 채팅 상단 고정 공지 등록/수정/해제
 * - 방송 제목과 별개로 채팅 참여자에게 즉시 보여줄 운영 메시지를 저장
 * - 빈 문자열은 공지 해제로 간주
 * - 성공 시 채팅방 브로드캐스트로 다른 클라이언트에 즉시 동기화
 *
 * @param {number} broadcastId - 방송 ID
 * @param {number} userId - 요청 사용자 ID
 * @param {string | null} notice - 저장할 공지 문구
 */
export const updatePinnedChatNotice = async (
  broadcastId: number,
  userId: number,
  notice: string | null
): Promise<
  | { success: true; notice: string | null }
  | {
      success: false;
      error: "FORBIDDEN" | "NOT_FOUND" | "UPDATE_FAILED";
    }
> => {
  try {
    const broadcast = await db.broadcast.findUnique({
      where: { id: broadcastId },
      select: {
        id: true,
        chatRoom: { select: { id: true } },
        liveInput: { select: { userId: true } },
      },
    });

    if (!broadcast) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (broadcast.liveInput.userId !== userId) {
      return { success: false, error: "FORBIDDEN" };
    }

    const normalizedNotice = notice?.trim() ? notice.trim() : null;

    const updated = await db.broadcast.update({
      where: { id: broadcastId },
      data: { pinnedChatNotice: normalizedNotice },
      select: { pinnedChatNotice: true },
    });

    if (broadcast.chatRoom?.id) {
      await supabase.channel(`room-${broadcast.chatRoom.id}`).send({
        type: "broadcast",
        event: "pinned_notice_updated",
        payload: {
          notice: updated.pinnedChatNotice ?? null,
        },
      });
    }

    return { success: true, notice: updated.pinnedChatNotice ?? null };
  } catch (e) {
    console.error("[updatePinnedChatNotice] error:", e);
    return { success: false, error: "UPDATE_FAILED" };
  }
};

/**
 * 방송 제목/설명 수정 결과를 현재 채팅방 참여자에게 실시간 전파
 * - 이미 스트림 상세에 열려 있는 시청자는 새로고침 없이 제목/설명을 즉시 갱신
 *
 * @param {number} broadcastId - 방송 ID
 * @param {string} title - 최신 방송 제목
 * @param {string | null} description - 최신 방송 설명
 */
export const broadcastStreamMetaUpdated = async (
  broadcastId: number,
  title: string,
  description: string | null
) => {
  try {
    const room = await getStreamChatRoom(broadcastId);
    if (!room?.id) return;

    await supabase.channel(`room-${room.id}`).send({
      type: "broadcast",
      event: "stream_meta_updated",
      payload: {
        title,
        description,
      },
    });
  } catch (e) {
    console.error("[broadcastStreamMetaUpdated] error:", e);
  }
};

