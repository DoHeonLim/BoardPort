/**
 * File Name : features/post/service/admin.ts
 * Description : 관리자 전용 게시글 관리 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   초기 구현
 * 2026.02.07  임도헌   Modified  Audit Log 연동 및 DTO(AdminPostListResponse) 타입 적용
 * 2026.02.08  임도헌   Modified  삭제 시 유저 알림(sendAdminActionNotification) 연동
 * 2026.03.07  임도헌   Modified  관리자 액션 실패 문구를 구체화(v1.2)
 */

import "server-only";
import db from "@/lib/db";
import { createAuditLog } from "@/features/report/service/audit";
import { sendAdminActionNotification } from "@/features/notification/service/notification";
import type { ServiceResult } from "@/lib/types";
import { AdminPostListResponse } from "@/features/post/types";
import { POST_SELECT } from "@/features/post/constants";

/**
 * 관리자용 전체 게시글 목록 조회
 *
 * @param page - 현재 페이지
 * @param limit - 페이지당 항목 수
 * @param query - 검색어
 */
export async function getPostsAdmin(
  page = 1,
  limit = 20,
  query?: string
): Promise<ServiceResult<AdminPostListResponse>> {
  try {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } }, // 내용 검색 포함
        { user: { username: { contains: query, mode: "insensitive" } } },
      ];
    }

    const [total, items] = await Promise.all([
      db.post.count({ where }),
      db.post.findMany({
        where,
        select: {
          ...POST_SELECT,
          user: { select: { id: true, username: true } },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      success: true,
      data: {
        items,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  } catch {
    return { success: false, error: "게시글 목록 로드 실패" };
  }
}

/**
 * 관리자 권한 게시글 강제 삭제
 * - 게시글을 삭제하고 Audit Log를 남김
 *
 * @param adminId - 관리자 ID
 * @param postId - 삭제할 게시글 ID
 * @param reason - 삭제 사유
 */
export async function deletePostByAdmin(
  adminId: number,
  postId: number,
  reason: string
): Promise<ServiceResult> {
  try {
    // 1. 존재 확인
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { title: true, userId: true },
    });

    if (!post) return { success: false, error: "이미 삭제된 게시글입니다." };

    // 2. 삭제 실행
    await db.post.delete({ where: { id: postId } });

    // 3. 감사 로그 기록
    await createAuditLog({
      adminId,
      action: "DELETE_POST",
      targetType: "POST",
      targetId: postId,
      reason: `Title: ${post.title} / OwnerID: ${post.userId} / Reason: ${reason}`,
    });

    // 4. 유저 알림 발송
    void sendAdminActionNotification({
      targetUserId: post.userId,
      type: "DELETE_POST",
      title: post.title,
      reason,
    });

    return { success: true };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      error:
        "게시글 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}
