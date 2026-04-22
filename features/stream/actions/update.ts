/**
 * File Name : features/stream/actions/update.ts
 * Description : 라이브 방송 메타 정보 수정 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.07  임도헌   Created   라이브 상세 상단 메뉴에서 제목/설명만 수정하는 서버 액션 추가
 * 2026.04.07  임도헌   Modified  저장 후 스트림 채팅방 브로드캐스트로 실시간 메타 동기화 추가
 */
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import getSession from "@/lib/session";
import * as T from "@/lib/cacheTags";
import {
  streamMetaUpdateSchema,
  type StreamMetaUpdateValues,
} from "@/features/stream/schemas";
import { broadcastStreamMetaUpdated } from "@/features/stream/service/chat";
import { updateBroadcastMeta } from "@/features/stream/service/update";
import type { UpdateBroadcastMetaResult } from "@/features/stream/types";

/**
 * 라이브 방송 제목/설명 수정 액션
 *
 * - 로그인 세션 확인
 * - 제목/설명 스키마 검증
 * - 수정 서비스 위임
 * - 상세/목록/채널 캐시 무효화
 */
export async function updateBroadcastMetaAction(
  broadcastId: number,
  rawData: StreamMetaUpdateValues
): Promise<UpdateBroadcastMetaResult> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  if (!Number.isFinite(broadcastId) || broadcastId <= 0) {
    return { success: false, error: "잘못된 방송 ID입니다." };
  }

  const parsed = streamMetaUpdateSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "입력값이 올바르지 않습니다.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await updateBroadcastMeta(session.id, broadcastId, parsed.data);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateTag(T.BROADCAST_DETAIL(broadcastId));
  revalidatePath("/streams");
  revalidatePath(`/streams/${broadcastId}`);
  revalidatePath(`/profile/${result.data.username}/channel`);
  await broadcastStreamMetaUpdated(
    broadcastId,
    result.data.title,
    result.data.description
  );

  return {
    success: true,
    data: {
      title: result.data.title,
      description: result.data.description,
    },
  };
}
