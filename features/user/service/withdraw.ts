/**
 * File Name : features/user/service/withdraw.ts
 * Description : 회원 탈퇴(계정 삭제) 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.23  임도헌   Created   회원 탈퇴 로직 추가
 * 2026.03.07  임도헌   Modified  탈퇴 실패 문구를 구체화(v1.2)
 */

import "server-only";
import db from "@/lib/db";
import type { ServiceResult } from "@/lib/types";

/**
 * 회원 탈퇴 처리
 * - 유저 데이터를 물리적으로 삭제 (Hard Delete)
 * - Prisma의 Cascade 설정으로 인해 연관된 데이터(게시글, 댓글 등)도 자동 삭제됨
 *
 * @param userId - 탈퇴할 유저 ID
 */
export async function withdrawUser(userId: number): Promise<ServiceResult> {
  try {
    await db.user.delete({
      where: { id: userId },
    });
    return { success: true };
  } catch (error) {
    console.error("withdrawUser service error:", error);
    return {
      success: false,
      error:
        "회원 탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}
