/**
 * File Name : features/stream/actions/chat.ts
 * Description : 스트리밍 채팅 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   created   app/streams/[id]/actions.ts (sendStreamMessageAction) -> features/stream/actions/chat.ts
 * 2026.02.05  임도헌   Modified  메시지 전송 시 스트리머와의 차단 관계 확인 로직 추가
 * 2026.04.03  임도헌   Modified  호스트 전용 스트림 채팅 메시지 삭제 Action 추가
 * 2026.04.03  임도헌   Modified  호스트 전용 스트림 시청자 강제 퇴장 Action 추가
 * 2026.04.03  임도헌   Modified  방송 단위 채팅 금지 토글과 전송 차단 가드 추가
 * 2026.04.03  임도헌   Modified  스트림 메시지 삭제 결과에 deleted_at을 포함해 placeholder 동기화를 지원
 * 2026.04.03  임도헌   Modified  스트림 채팅 상단 고정 공지 등록/수정/해제 Action 추가
 * 2026.04.03  임도헌   Modified  방송 단위 채팅 금지 대상 목록 조회 Action 추가
 */

"use server";

import getSession from "@/lib/session";
import db from "@/lib/db";
import {
  createStreamMessage,
  deleteStreamMessage,
  getMutedStreamViewers,
  isStreamViewerMuted,
  kickStreamViewer,
  toggleStreamChatMute,
  updatePinnedChatNotice,
} from "@/features/stream/service/chat";
import { checkBlockRelation } from "@/features/user/service/block";
import type {
  DeleteStreamMessageResult,
  GetMutedStreamViewerListResult,
  KickStreamViewerResult,
  SendStreamMessageResult,
  ToggleStreamChatMuteResult,
  UpdatePinnedChatNoticeResult,
} from "@/features/stream/types";
import { STREAM_PINNED_NOTICE_MAX_LENGTH } from "@/features/stream/constants";

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
          select: {
            id: true,
            liveInput: { select: { userId: true } },
          },
        },
      },
    });

    if (!room || !room.broadcast) {
      return { success: false, error: "CREATE_FAILED" };
    }

    const hostId = room.broadcast.liveInput.userId;
    const broadcastId = room.broadcast.id;

    // 차단 관계 확인
    // 내가 호스트를 차단했거나, 호스트가 나를 차단했으면 전송 불가
    if (session.id !== hostId) {
      const isBlocked = await checkBlockRelation(session.id, hostId);
      if (isBlocked) {
        // RATE_LIMITED 등 적절한 에러 코드로 리턴하거나 커스텀 에러 처리
        // 여기서는 생성 실패로 처리
        return { success: false, error: "CREATE_FAILED" };
      }

      const isMuted = await isStreamViewerMuted(broadcastId, session.id);
      if (isMuted) {
        return { success: false, error: "MUTED" };
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

/**
 * 스트리밍 채팅 메시지 삭제 Action
 * - 현재는 방송 호스트만 메시지 삭제 가능
 * - 성공 시 클라이언트가 실시간 삭제 이벤트를 브로드캐스트할 수 있도록 messageId를 반환
 */
export const deleteStreamMessageAction = async (
  messageId: number
): Promise<DeleteStreamMessageResult> => {
  try {
    const session = await getSession();
    if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" };

    return await deleteStreamMessage(messageId, session.id);
  } catch (e) {
    console.error("[deleteStreamMessageAction] error:", e);
    return { success: false, error: "DELETE_FAILED" };
  }
};

/**
 * 스트림 시청자 강제 퇴장 Action
 * - 현재 방송 호스트만 특정 시청자를 방송에서 즉시 이탈시킬 수 있음
 * - 전역 차단과 달리 현재 방송 세션에만 적용되는 운영 액션
 */
export const kickStreamViewerAction = async (
  broadcastId: number,
  targetId: number
): Promise<KickStreamViewerResult> => {
  try {
    const session = await getSession();
    if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" };

    return await kickStreamViewer(broadcastId, targetId, session.id);
  } catch (e) {
    console.error("[kickStreamViewerAction] error:", e);
    return { success: false, error: "KICK_FAILED" };
  }
};

/**
 * 스트림 시청자 채팅 금지 토글 Action
 * - 현재 방송 호스트만 특정 시청자의 채팅 권한을 방송 단위로 끄고 켤 수 있음
 */
export const toggleStreamChatMuteAction = async (
  broadcastId: number,
  targetId: number,
  intent: "mute" | "unmute"
): Promise<ToggleStreamChatMuteResult> => {
  try {
    const session = await getSession();
    if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" };

    return await toggleStreamChatMute(
      broadcastId,
      targetId,
      session.id,
      intent
    );
  } catch (e) {
    console.error("[toggleStreamChatMuteAction] error:", e);
    return { success: false, error: "MUTE_FAILED" };
  }
};

/**
 * 방송 단위 채팅 금지 대상 목록 조회 Action
 * - 현재 방송 호스트만 조회 가능
 */
export const getMutedStreamViewerListAction = async (
  broadcastId: number
): Promise<GetMutedStreamViewerListResult> => {
  try {
    const session = await getSession();
    if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" };

    return await getMutedStreamViewers(broadcastId, session.id);
  } catch (e) {
    console.error("[getMutedStreamViewerListAction] error:", e);
    return { success: false, error: "FETCH_FAILED" };
  }
};

/**
 * 스트림 채팅 상단 고정 공지 등록/수정/해제 Action
 * - 방송 호스트만 실행 가능
 * - 빈 문자열은 공지 해제로 처리
 */
export const updatePinnedChatNoticeAction = async (
  broadcastId: number,
  notice: string | null
): Promise<UpdatePinnedChatNoticeResult> => {
  try {
    const session = await getSession();
    if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" };

    const normalizedNotice = notice?.trim() ?? "";
    if (normalizedNotice.length > STREAM_PINNED_NOTICE_MAX_LENGTH) {
      return { success: false, error: "NOTICE_TOO_LONG" };
    }

    return await updatePinnedChatNotice(
      broadcastId,
      session.id,
      normalizedNotice
    );
  } catch (e) {
    console.error("[updatePinnedChatNoticeAction] error:", e);
    return { success: false, error: "UPDATE_FAILED" };
  }
};

