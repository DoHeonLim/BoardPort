/**
 * File Name : features/stream/service/update.ts
 * Description : 라이브 방송 메타 정보(제목/설명) 수정 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.07  임도헌   Created   라이브 중 호스트가 제목/설명만 빠르게 수정할 수 있는 서비스 추가
 */

import "server-only";

import db from "@/lib/db";
import { validateUserStatus } from "@/features/user/service/admin";
import type { ServiceResult } from "@/lib/types";
import type { StreamMetaUpdateValues } from "@/features/stream/schemas";

/**
 * 라이브 방송 제목/설명 수정
 *
 * - 요청자 이용 가능 상태 확인
 * - 방송 소유권 확인
 * - 제목과 설명만 갱신
 */
export async function updateBroadcastMeta(
  userId: number,
  broadcastId: number,
  data: StreamMetaUpdateValues
): Promise<
  ServiceResult<{
    broadcastId: number;
    title: string;
    description: string | null;
    username: string;
  }>
> {
  try {
    const status = await validateUserStatus(userId);
    if (!status.success) return status;

    const existing = await db.broadcast.findUnique({
      where: { id: broadcastId },
      select: {
        id: true,
        liveInput: {
          select: {
            userId: true,
            user: { select: { username: true } },
          },
        },
      },
    });

    if (!existing || !existing.liveInput) {
      return { success: false, error: "방송을 찾을 수 없습니다." };
    }

    if (existing.liveInput.userId !== userId) {
      return { success: false, error: "방송 수정 권한이 없습니다." };
    }

    const updated = await db.broadcast.update({
      where: { id: broadcastId },
      data: {
        title: data.title.trim(),
        description: data.description?.trim() || null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        liveInput: {
          select: {
            user: { select: { username: true } },
          },
        },
      },
    });

    return {
      success: true,
      data: {
        broadcastId: updated.id,
        title: updated.title,
        description: updated.description,
        username: updated.liveInput.user.username,
      },
    };
  } catch (error) {
    console.error("[updateBroadcastMeta] failed:", error);
    return {
      success: false,
      error:
        "방송 정보 수정에 실패했습니다. 제목과 설명을 확인한 뒤 다시 시도해주세요.",
    };
  }
}
