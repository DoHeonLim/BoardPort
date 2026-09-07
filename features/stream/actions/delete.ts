/**
 * File Name : features/stream/actions/delete.ts
 * Description : 방송 및 LiveInput 삭제 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   Moved     app/streams/[id]/actions.ts (deleteBroadcastAction, deleteLiveInputAction) -> features/stream/actions/delete.ts
 * 2026.02.22  임도헌   Modified  본인 방송 삭제 시 메인 스트림 목록(/streams) 캐시 무효화 추가
 * 2026.03.05  임도헌   Modified  개인화된 방송 목록 캐시의 `revalidateTag` 호출 제거 및 `revalidatePath` 기반 단순화 적용
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.04.02  임도헌   Modified  삭제 액션 파라미터/반환 JSDoc 보강
 * 2026.05.16  임도헌   Modified  방송 삭제 사전 조회를 stream service 헬퍼로 이동
 * 2026.08.23  임도헌   Modified  Next.js 16 revalidateTag 만료 프로필 인자 반영
 */

"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import getSession from "@/lib/session";
import {
  deleteBroadcast,
  getBroadcastDeleteMeta,
  getBroadcastIdsByLiveInput,
} from "@/features/stream/service/delete";
import { deleteLiveInput } from "@/features/stream/service/liveInput";

/**
 * 방송 삭제 Action
 * - 소유권을 확인하고 방송을 삭제
 * - 성공 시 방송 상세 및 유저 방송국 목록 캐시를 무효화
 *
 * @param {number} broadcastId - 삭제할 방송 ID
 * @returns {Promise<{ success: true } | { success: false; error: string }>} 삭제 결과
 */
export const deleteBroadcastAction = async (broadcastId: number) => {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  const broadcast = await getBroadcastDeleteMeta(broadcastId);

  if (!broadcast || broadcast.ownerId !== session.id) {
    return { success: false, error: "권한이 없습니다." };
  }

  const result = await deleteBroadcast(broadcastId);

  if (result.success) {
    revalidateTag(T.BROADCAST_DETAIL(broadcastId), { expire: 0 });
    revalidatePath("/streams");
  }
  return result;
};

/**
 * LiveInput 삭제 Action
 * - LiveInput과 연결된 방송들의 캐시를 무효화
 *
 * @param {number} liveInputId - 삭제할 LiveInput ID
 * @returns {Promise<{ success: true } | { success: false; error: string }>} 삭제 결과
 */
export async function deleteLiveInputAction(liveInputId: number) {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  const affectedBroadcastIds = await getBroadcastIdsByLiveInput(liveInputId);

  const result = await deleteLiveInput(liveInputId, session.id);

  if (result.success) {
    for (const broadcastId of affectedBroadcastIds) {
      revalidateTag(T.BROADCAST_DETAIL(broadcastId), { expire: 0 });
    }
  }

  return result;
}
