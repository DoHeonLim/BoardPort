/**
 * File Name : features/stream/actions/delete.ts
 * Description : 방송 및 LiveInput 삭제 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   Moved     app/streams/[id]/actions.ts (deleteBroadcastAction, deleteLiveInputAction) -> features/stream/actions/delete.ts
 * 2026.02.22  임도헌   Modified  본인 방송 삭제 시 메인 스트림 목록(/streams) 캐시 무효화 추가
 * 2026.03.05  임도헌   Modified  개인화된 방송 목록 캐시의 `revalidateTag` 호출 제거 및 `revalidatePath` 기반 단순화 적용
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import getSession from "@/lib/session";
import db from "@/lib/db";
import { deleteBroadcast } from "@/features/stream/service/delete";
import { deleteLiveInput } from "@/features/stream/service/liveInput";

/**
 * 방송 삭제 Action
 * - 소유권을 확인하고 방송을 삭제
 * - 성공 시 방송 상세 및 유저 방송국 목록 캐시를 무효화
 */
export const deleteBroadcastAction = async (broadcastId: number) => {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  const broadcast = await db.broadcast.findUnique({
    where: { id: broadcastId },
    select: { liveInput: { select: { userId: true } } },
  });

  if (!broadcast || broadcast.liveInput.userId !== session.id) {
    return { success: false, error: "권한이 없습니다." };
  }

  const result = await deleteBroadcast(broadcastId);

  if (result.success) {
    revalidateTag(T.BROADCAST_DETAIL(broadcastId));
    revalidatePath("/streams");
  }
  return result;
};

/**
 * LiveInput 삭제 Action
 * - LiveInput과 연결된 방송들의 캐시를 무효화
 */
export async function deleteLiveInputAction(liveInputId: number) {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  const affected = await db.broadcast.findMany({
    where: { liveInputId },
    select: { id: true },
  });

  const result = await deleteLiveInput(liveInputId, session.id);

  if (result.success) {
    for (const b of affected) {
      revalidateTag(T.BROADCAST_DETAIL(b.id));
    }
  }

  return result;
}
