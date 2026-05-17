/**
 * File Name : features/product/service/admin.ts
 * Description : 관리자 전용 상품 관리 비즈니스 로직 (목록 조회, 강제 삭제)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created
 * 2026.02.07  임도헌   Modified  Audit Log 연동 및 DTO(AdminProductListResponse) 타입 적용
 * 2026.02.08  임도헌   Modified  삭제 시 유저 알림(sendAdminActionNotification) 연동
 * 2026.03.07  임도헌   Modified  관리자 액션 실패 문구를 구체화(v1.2)
 * 2026.03.31  임도헌   Modified  관리자 삭제도 일반 삭제와 같은 태그/이미지 cleanup 규칙을 재사용
 * 2026.04.02  임도헌   Modified  관리자 서비스 JSDoc 태그 형식 정리
 * 2026.05.15  임도헌   Modified  관리자 상품 검색 범위에 검색 태그명 포함
 * 2026.05.16  임도헌   Modified  관리자 검색 where 조건 타입 명시
 */

import "server-only";
import db from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { createAuditLog } from "@/features/report/service/audit";
import { sendAdminActionNotification } from "@/features/notification/service/notification";
import { hardDeleteProductWithCleanup } from "@/features/product/service/delete";
import type { ServiceResult } from "@/lib/types";
import type {
  AdminProductListResponse,
  ProductDeleteMeta,
} from "@/features/product/types";

/**
 * 관리자용 전체 상품 목록 조회
 * - 삭제된 상품을 제외한 전체 상품을 최신순으로 조회
 * - 관리자 페이지네이션을 위한 메타데이터를 포함
 * - 조치 대상 탐색을 위해 제목, 작성자, ID, 검색 태그명 검색을 지원
 *
 * @param page - 현재 페이지 (기본값: 1)
 * @param limit - 페이지당 항목 수 (기본값: 20)
 * @param query - 검색어
 * @returns {Promise<ServiceResult<AdminProductListResponse>>} 상품 목록 및 페이징 정보
 */
export async function getProductsAdmin(
  page = 1,
  limit = 20,
  query?: string
): Promise<ServiceResult<AdminProductListResponse>> {
  try {
    const skip = (page - 1) * limit;

    // 검색 조건 구성
    const where: Prisma.ProductWhereInput = {};
    if (query) {
      // 숫자 검색어의 상품 ID 직접 매칭 지원
      const parsedProductId = /^\d+$/.test(query.trim())
        ? Number(query.trim())
        : null;
      // 신고/조치 대상 탐색 목적에 맞춘 사용자 노출 태그 포함 검색
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { user: { username: { contains: query, mode: "insensitive" } } },
        {
          search_tags: {
            some: { name: { contains: query, mode: "insensitive" } },
          },
        },
        ...(parsedProductId !== null ? [{ id: parsedProductId }] : []),
      ];
    }

    // 총개수/목록 병렬 조회
    const [total, items] = await Promise.all([
      db.product.count({ where }),
      db.product.findMany({
        where,
        select: {
          id: true,
          title: true,
          price: true,
          created_at: true,
          reservation_userId: true,
          purchase_userId: true,
          user: {
            select: {
              id: true,
              username: true,
            },
          },
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
    return { success: false, error: "상품 목록 로드 실패" };
  }
}

/**
 * 관리자 권한 상품 강제 삭제
 * - 상품을 DB에서 삭제하고 Audit Log를 기록
 * - 물리적 삭제(Hard Delete)를 수행
 *
 * @param {number} adminId - 수행하는 관리자 ID
 * @param {number} productId - 삭제할 상품 ID
 * @param {string} reason - 삭제 사유
 * @returns {Promise<ServiceResult<ProductDeleteMeta & { chatUserIds: number[] }>>} 삭제 결과와 캐시 무효화 메타데이터
 */
export async function deleteProductByAdmin(
  adminId: number,
  productId: number,
  reason: string
): Promise<ServiceResult<ProductDeleteMeta & { chatUserIds: number[] }>> {
  try {
    // 삭제 전 참조 메타 확보
    const product = await db.product.findUnique({
      where: { id: productId },
      select: {
        title: true,
        userId: true,
        user: { select: { username: true } },
        purchase_userId: true,
        reservation_userId: true,
        search_tags: { select: { name: true } },
        images: { select: { url: true } },
        chat_rooms: { select: { users: { select: { id: true } } } },
      },
    });

    if (!product) return { success: false, error: "이미 삭제된 상품입니다." };

    // 연관 채팅방 참여 유저 중복 제거
    const chatUserIds = Array.from(
      new Set(product.chat_rooms.flatMap((room) => room.users.map((u) => u.id)))
    );

    // 일반 삭제와 동일한 cleanup 재사용
    await hardDeleteProductWithCleanup({
      id: productId,
      search_tags: product.search_tags,
      images: product.images,
    });

    // 감사 로그 기록
    await createAuditLog({
      adminId,
      action: "DELETE_PRODUCT",
      targetType: "PRODUCT",
      targetId: productId, // 삭제된 ID지만 기록용으로 남김
      reason: `Title: ${product.title} / OwnerID: ${product.userId} / Reason: ${reason}`,
    });

    // 판매자 알림 발송
    void sendAdminActionNotification({
      targetUserId: product.userId,
      type: "DELETE_PRODUCT",
      title: product.title,
      reason,
      link: "/profile/my-sales",
    });

    return {
      success: true,
      data: {
        id: productId,
        userId: product.userId,
        purchase_userId: product.purchase_userId,
        reservation_userId: product.reservation_userId,
        chatUserIds,
      },
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      error: "상품 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}
