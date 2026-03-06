/**
 * File Name : features/stream/service/delete.ts
 * Description : 방송 삭제 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.09.17  임도헌   Created   VodAsset → Broadcast 삭제 유틸 (트랜잭션 주입)
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 * 2026.01.28  임도헌   Modified  주석 보강
 * 2026.03.07  임도헌   Modified  삭제 실패 문구를 구체화(v1.2)
 */

import "server-only";
import db from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

type DeleteResult = { success: true } | { success: false; error: string };

/**
 * 트랜잭션 내에서 방송 삭제 수행 (VodAsset -> Broadcast 순서)
 *
 * @param {Prisma.TransactionClient} tx - 트랜잭션 클라이언트
 * @param {number} broadcastId - 삭제할 방송 ID
 */
export async function deleteBroadcastTx(
  tx: Prisma.TransactionClient,
  broadcastId: number
): Promise<DeleteResult> {
  try {
    if (!Number.isFinite(broadcastId)) {
      return { success: false, error: "잘못된 요청입니다.(id)" };
    }
    // 종속된 VOD 먼저 삭제 (Cascade 설정이 없을 경우 대비)
    await tx.vodAsset.deleteMany({ where: { broadcastId } });
    await tx.broadcast.delete({ where: { id: broadcastId } });

    return { success: true };
  } catch (e) {
    console.error("[deleteBroadcastTx] failed:", e);
    return {
      success: false,
      error:
        "방송 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

/**
 * 방송 삭제 (단독 실행용)
 */
export async function deleteBroadcast(
  broadcastId: number
): Promise<DeleteResult> {
  return await db.$transaction((tx) => deleteBroadcastTx(tx, broadcastId));
}
