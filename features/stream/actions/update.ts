/**
 * File Name : features/stream/actions/update.ts
 * Description : 방송 표시 정보 수정 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.07  임도헌   Created   방송 상세 상단 메뉴에서 제목/설명만 수정하는 서버 액션 추가
 * 2026.04.07  임도헌   Modified  저장 후 스트림 채팅방 브로드캐스트로 실시간 메타 동기화 추가
 * 2026.08.23  임도헌   Modified  Next.js 16 revalidateTag 만료 프로필 인자 반영
 * 2026.09.08  임도헌   Modified  사용자 썸네일 교체·제거와 관련 화면 갱신 추가
 * 2026.09.08  임도헌   Modified  녹화본 전용 제목·썸네일 수정 액션 추가
 * 2026.09.09  임도헌   Modified  방송 수정 직후 상세 본문을 보장하는 updateTag 적용과 녹화본의 중복 만료 제거
 */
"use server";

import { revalidatePath, updateTag } from "next/cache";
import getSession from "@/lib/session";
import * as T from "@/lib/cacheTags";
import {
  recordingMetaUpdateSchema,
  streamMetaUpdateSchema,
  type RecordingMetaUpdateValues,
  type StreamMetaUpdateValues,
} from "@/features/stream/schemas";
import { broadcastStreamMetaUpdated } from "@/features/stream/service/chat";
import {
  updateBroadcastMeta,
  updateRecordingMeta,
} from "@/features/stream/service/update";
import type {
  UpdateBroadcastMetaResult,
  UpdateRecordingMetaResult,
} from "@/features/stream/types";

/**
 * 방송 표시 정보 수정 액션
 *
 * - 로그인 세션 확인
 * - 제목·설명·선택적 사용자 썸네일 스키마 검증
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

  const result = await updateBroadcastMeta(
    session.id,
    broadcastId,
    parsed.data
  );
  if (!result.success) {
    return { success: false, error: result.error };
  }

  updateTag(T.BROADCAST_DETAIL(broadcastId));
  revalidatePath("/streams");
  revalidatePath(`/streams/${broadcastId}`);
  revalidatePath("/profile");
  revalidatePath(`/profile/${result.data.username}`);
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
      thumbnail: result.data.thumbnail,
      thumbnailAnimated: result.data.thumbnailAnimated,
    },
  };
}

/** 녹화본 전용 제목과 사용자 썸네일 수정 액션 */
export async function updateRecordingMetaAction(
  vodId: number,
  rawData: RecordingMetaUpdateValues
): Promise<UpdateRecordingMetaResult> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }
  if (!Number.isFinite(vodId) || vodId <= 0) {
    return { success: false, error: "잘못된 녹화본 ID입니다." };
  }

  const parsed = recordingMetaUpdateSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "입력값이 올바르지 않습니다.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await updateRecordingMeta(session.id, vodId, parsed.data);
  if (!result.success) return result;

  revalidatePath("/streams");
  revalidatePath(`/streams/${vodId}/recording`);
  revalidatePath("/profile");
  revalidatePath(`/profile/${result.data.username}`);
  revalidatePath(`/profile/${result.data.username}/channel`);

  return result;
}
