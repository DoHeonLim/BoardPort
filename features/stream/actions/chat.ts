/**
 * File Name : features/stream/actions/chat.ts
 * Description : 스트리밍 채팅 서버 액션
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
 * 2026.05.16  임도헌   Modified  현재 actions 계층 역할에 맞게 파일 설명 정리
 * 2026.05.16  임도헌   Modified  채팅방 조회와 rate limit 카운트를 service 계층으로 이동
 * 2026.08.21  임도헌   Modified  방송 접근 권한을 메시지 전송 시점에 재검증하도록 보강
 */

"use server";

import getSession from "@/lib/session";
import {
  countRecentStreamMessages,
  createStreamMessage,
  deleteStreamMessage,
  getStreamChatSendContext,
  getMutedStreamViewers,
  isStreamViewerMuted,
  kickStreamViewer,
  toggleStreamChatMute,
  updatePinnedChatNotice,
} from "@/features/stream/service/chat";
import { authorizeBroadcastAccess } from "@/features/stream/service/access";
import type {
  DeleteStreamMessageResult,
  GetMutedStreamViewerListResult,
  KickStreamViewerResult,
  SendStreamMessageResult,
  ToggleStreamChatMuteResult,
  UpdatePinnedChatNoticeResult,
} from "@/features/stream/types";
import {
  STREAM_CHAT_MESSAGE_MAX_LENGTH,
  STREAM_CHAT_RATE_LIMIT_MAX,
  STREAM_CHAT_RATE_LIMIT_WINDOW_MS,
  STREAM_PINNED_NOTICE_MAX_LENGTH,
} from "@/features/stream/constants";

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
    if (text.length > STREAM_CHAT_MESSAGE_MAX_LENGTH)
      return { success: false, error: "MESSAGE_TOO_LONG" };

    // 전송 권한 판단에 필요한 방송/호스트 정보 조회
    const context = await getStreamChatSendContext(streamChatRoomId);

    if (!context) {
      return { success: false, error: "CREATE_FAILED" };
    }

    const { hostId, broadcastId } = context;

    // 열려 있던 화면에서도 팔로우·차단·PRIVATE 언락 상태가 바뀔 수 있으므로
    // 실제 메시지를 쓰기 직전에 현재 세션 기준으로 다시 판정한다.
    const access = await authorizeBroadcastAccess(
      broadcastId,
      session.id,
      session
    );
    if (!access.allowed) {
      return { success: false, error: "CREATE_FAILED" };
    }

    if (session.id !== hostId) {
      const isMuted = await isStreamViewerMuted(broadcastId, session.id);
      if (isMuted) {
        return { success: false, error: "MUTED" };
      }
    }

    // 채팅 폭주를 막기 위해 최근 전송량만 service에서 카운트
    const since = new Date(Date.now() - STREAM_CHAT_RATE_LIMIT_WINDOW_MS);
    const recentCount = await countRecentStreamMessages(
      session.id,
      streamChatRoomId,
      since
    );

    if (recentCount >= STREAM_CHAT_RATE_LIMIT_MAX) {
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
