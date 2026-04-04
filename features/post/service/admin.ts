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
 * 2026.03.31  임도헌   Modified  검색 조건과 강제 삭제 후속 처리 흐름 설명 보강
 * 2026.04.02  임도헌   Modified  관리자 서비스 JSDoc 태그 형식 정리
 */

import "server-only";
import db from "@/lib/db";
import { createAuditLog } from "@/features/report/service/audit";
import { sendAdminActionNotification } from "@/features/notification/service/notification";
import { hardDeletePostWithCleanup } from "@/features/post/service/post";
import type { ServiceResult } from "@/lib/types";
import { AdminPostListResponse } from "@/features/post/types";
import { POST_SELECT } from "@/features/post/selects";

/**
 * 관리자용 전체 게시글 목록 조회
 *
 * [기능]
 * - 관리자 전용으로 전체 게시글을 최신순 조회
 * - 제목, 본문, 작성자, 숫자 ID 검색을 함께 지원
 * - 카드/테이블 공용 목록 DTO를 반환
 *
 * @param {number} page - 현재 페이지
 * @param {number} limit - 페이지당 항목 수
 * @param {string} [query] - 검색어
 * @returns {Promise<ServiceResult<AdminPostListResponse>>} 관리자 게시글 목록 결과
 */
export async function getPostsAdmin(
  page = 1,
  limit = 20,
  query?: string
): Promise<ServiceResult<AdminPostListResponse>> {
  try {
    const skip = (page - 1) * limit;

    const where: any = {};
    // 관리자 검색 조건
    // 제목, 본문, 작성자, 숫자 ID exact match를 하나의 입력으로 수용
    if (query) {
      const parsedPostId = /^\d+$/.test(query.trim()) ? Number(query.trim()) : null;
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } }, // 내용 검색 포함
        { user: { username: { contains: query, mode: "insensitive" } } },
        ...(parsedPostId !== null ? [{ id: parsedPostId }] : []),
      ];
    }

    // 페이지네이션 기준 동기화
    // 전체 개수와 현재 페이지 항목을 함께 조회해 숫자형 페이지네이션과 맞춤
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
 *
 * [기능]
 * - 관리자 권한으로 게시글을 강제 삭제
 * - 감사 로그와 사용자 알림까지 함께 처리
 *
 * @param {number} adminId - 관리자 ID
 * @param {number} postId - 삭제할 게시글 ID
 * @param {string} reason - 삭제 사유
 * @returns {Promise<ServiceResult<{ postId: number; username: string }>>} 삭제된 게시글 ID와 작성자 username
 */
export async function deletePostByAdmin(
  adminId: number,
  postId: number,
  reason: string
): Promise<ServiceResult<{ postId: number; username: string }>> {
  try {
    // 삭제 대상 확인
    const post = await db.post.findUnique({
      where: { id: postId },
      select: {
        title: true,
        userId: true,
        user: { select: { username: true } },
        tags: { select: { name: true } },
        video: { select: { providerAssetId: true, uploadUid: true } },
      },
    });

    if (!post) return { success: false, error: "이미 삭제된 게시글입니다." };

    // 본문 삭제 실행
    // 일반 삭제와 동일한 후처리 규칙을 재사용해 태그/동영상 orphan 데이터를 남기지 않음
    await hardDeletePostWithCleanup({
      id: postId,
      tags: post.tags,
      video: post.video,
    });

    // 운영 추적용 감사 로그
    await createAuditLog({
      adminId,
      action: "DELETE_POST",
      targetType: "POST",
      targetId: postId,
      reason: `Title: ${post.title} / OwnerID: ${post.userId} / Reason: ${reason}`,
    });

    // 사용자 복귀 경로를 포함한 관리자 조치 알림
    void sendAdminActionNotification({
      targetUserId: post.userId,
      type: "DELETE_POST",
      title: post.title,
      reason,
      link: "/profile",
    });

    return {
      success: true,
      data: { postId, username: post.user.username },
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      error:
        "게시글 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}
