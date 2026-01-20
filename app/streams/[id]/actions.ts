/**
 * File Name : app/streams/[id]/actions
 * Description : 라이브 스트리밍 server 코드
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.12  임도헌   Created
 * 2024.11.12  임도헌   Modified  현재 스트리밍 얻어오는 코드 추가
 * 2024.11.18  임도헌   Modified  스트리밍이 끝났다면 삭제하는 코드 추가
 * 2024.11.19  임도헌   Modified  캐싱 기능 추가
 * 2024.11.21  임도헌   Modified  console.log 삭제
 * 2024.11.22  임도헌   Modified  스트리밍 채팅방 관련 코드 추가
 * 2025.05.01  임도헌   Modified  .tsx -> .ts로 수정
 * 2025.07.30  임도헌   Modified  비즈니스 로직 lib로 분리하고 revalidateTag만 유지
 * 2025.08.19  임도헌   Modified  rotateStreamKeyAction 추가
 * 2025.09.06  임도헌   Modified  sendStreamMessageAction 입력 검증/에러 코드 통일, 메시지 캐시 리빌리데이트 제거, import 경로 정리
 * 2025.11.22  임도헌   Modified  broadcast-list 캐시 태그 제거 및 user-streams-id 태그 갱신 추가
 */
"use server";

import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import getSession from "@/lib/session";
import { deleteBroadcast } from "@/features/stream/lib/deleteBroadcast";
import { deleteLiveInput } from "@/features/stream/lib/deleteLiveInput";
import { StreamChatMessage } from "@/types/chat";
import db from "@/lib/db";
import { createStreamMessage } from "@/features/stream/lib/createStreamMessage";
import { rotateLiveInputKey } from "@/features/stream/lib/rotateLiveInputKey";

/**
 * 스트리밍 삭제 후 캐시 무효화
 */
export const deleteBroadcastAction = async (broadcastId: number) => {
  // 삭제 전에 소유자 id 확보 → user-broadcasts 태그 무효화용
  const owner = await db.broadcast.findUnique({
    where: { id: broadcastId },
    select: {
      liveInput: {
        select: { userId: true },
      },
    },
  });

  const result = await deleteBroadcast(broadcastId);
  if (result.success) {
    revalidateTag(T.BROADCAST_DETAIL(broadcastId));

    const ownerId = owner?.liveInput?.userId;
    if (ownerId) {
      revalidateTag(T.USER_STREAMS_ID(ownerId));
    }
  }
  return result;
};

/**
 * 스트리밍 메시지 전송 (브로드캐스트용 전체 메시지 반환)
 * - 공백 차단, 길이 제한, 비로그인 가드
 * - 캐시 리빌리데이트 제거(실시간 브로드캐스트로 갱신)
 */
export type SendStreamMessageResult =
  | { success: true; message: StreamChatMessage }
  | {
      success: false;
      error:
        | "NOT_LOGGED_IN"
        | "EMPTY_MESSAGE"
        | "MESSAGE_TOO_LONG"
        | "RATE_LIMITED"
        | "CREATE_FAILED";
    };

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

    // Rate limit: 같은 방에서 같은 유저가 10초에 10개 초과 전송 금지
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

    // DB 저장 후 완전한 메시지 객체 획득
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

export async function rotateLiveInputKeyAction(liveInputId: number) {
  const result = await rotateLiveInputKey(liveInputId);

  return result;
}

/**
 * LiveInput 삭제
 * - 연결된 Broadcast들의 상세 캐시가 깨지므로 관련 상세 태그 무효화
 * - 삭제 전에 영향 받는 broadcast id / owner id들을 확보해서 revalidate
 */
export async function deleteLiveInputAction(liveInputId: number) {
  // 삭제 전에 참조 중인 broadcast id + ownerId를 수집
  const affected = await db.broadcast.findMany({
    where: { liveInputId },
    select: {
      id: true,
      liveInput: {
        select: { userId: true },
      },
    },
  });

  const result = await deleteLiveInput(liveInputId);

  if (result.success) {
    const ownerIds = new Set<number>();

    for (const { id, liveInput } of affected) {
      revalidateTag(T.BROADCAST_DETAIL(id));
      if (liveInput?.userId) {
        ownerIds.add(liveInput.userId);
      }
    }

    for (const ownerId of ownerIds) {
      revalidateTag(T.USER_STREAMS_ID(ownerId));
    }
  }

  return result;
}
