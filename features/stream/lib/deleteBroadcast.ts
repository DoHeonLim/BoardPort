/**
 * File Name : features/stream/lib/deleteBroadcast.ts
 * Description : Broadcast(+ VodAsset) 삭제 유틸 — 트랜잭션 클라이언트 주입형
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.09.17  임도헌   Created   VodAsset → Broadcast 삭제 유틸 (트랜잭션 주입)
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 */

import "server-only";
import db from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

type DeleteResult = { success: true } | { success: false; error: string };

/**
 * 트랜잭션 컨텍스트 내에서 VodAsset → Broadcast 순으로 삭제
 */
export async function deleteBroadcastTx(
  tx: Prisma.TransactionClient,
  broadcastId: number
): Promise<DeleteResult> {
  try {
    if (!Number.isFinite(broadcastId)) {
      return { success: false, error: "잘못된 요청입니다.(id)" };
    }

    const exists = await tx.broadcast.findUnique({
      where: { id: broadcastId },
      select: { id: true },
    });
    if (!exists) return { success: false, error: "존재하지 않는 방송입니다." };

    // VodAsset → Broadcast 순서로 삭제
    await tx.vodAsset.deleteMany({ where: { broadcastId } });
    await tx.broadcast.delete({ where: { id: broadcastId } });

    return { success: true };
  } catch (e) {
    console.error("[deleteBroadcastTx] failed:", e);
    return { success: false, error: "방송 삭제 중 오류가 발생했습니다." };
  }
}

/**
 * 트랜잭션 없이 단일 호출로 삭제하고 싶을 때 사용하는 헬퍼
 * 내부에서 $transaction을 열어 deleteBroadcastTx를 호출
 */
export async function deleteBroadcast(
  broadcastId: number
): Promise<DeleteResult> {
  try {
    return await db.$transaction((tx) => deleteBroadcastTx(tx, broadcastId));
  } catch (e) {
    console.error("[deleteBroadcast] failed:", e);
    return { success: false, error: "방송 삭제 중 오류가 발생했습니다." };
  }
}
