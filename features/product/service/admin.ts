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
 */

import "server-only";
import db from "@/lib/db";
import { createAuditLog } from "@/features/report/service/audit";
import { sendAdminActionNotification } from "@/features/notification/service/notification";
import type { ServiceResult } from "@/lib/types";
import type {
  AdminProductListResponse,
  ProductDeleteMeta,
} from "@/features/product/types";

/**
 * 관리자용 전체 상품 목록 조회
 * - 삭제된 상품을 제외한 전체 상품을 최신순으로 조회
 * - 관리자 페이지네이션을 위한 메타데이터를 포함
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
    const where: any = {};
    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { user: { username: { contains: query, mode: "insensitive" } } },
      ];
    }

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
 * @param adminId - 수행하는 관리자 ID
 * @param productId - 삭제할 상품 ID
 * @param reason - 삭제 사유
 */
export async function deleteProductByAdmin(
  adminId: number,
  productId: number,
  reason: string
): Promise<ServiceResult<ProductDeleteMeta & { chatUserIds: number[] }>> {
  try {
    // 1. 존재 확인 (Audit Log에 기록할 정보 확보용)
    const product = await db.product.findUnique({
      where: { id: productId },
      select: {
        title: true,
        userId: true,
        purchase_userId: true,
        reservation_userId: true,
        chat_rooms: { select: { users: { select: { id: true } } } },
      },
    });

    if (!product) return { success: false, error: "이미 삭제된 상품입니다." };

    const chatUserIds = Array.from(
      new Set(product.chat_rooms.flatMap((room) => room.users.map((u) => u.id)))
    );

    // 2. 삭제 실행
    await db.product.delete({ where: { id: productId } });

    // 3. 감사 로그 기록
    await createAuditLog({
      adminId,
      action: "DELETE_PRODUCT",
      targetType: "PRODUCT",
      targetId: productId, // 삭제된 ID지만 기록용으로 남김
      reason: `Title: ${product.title} / OwnerID: ${product.userId} / Reason: ${reason}`,
    });

    // 4. 유저 알림 발송 (Fire & Forget)
    void sendAdminActionNotification({
      targetUserId: product.userId,
      type: "DELETE_PRODUCT",
      title: product.title,
      reason,
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
    return { success: false, error: "상품 삭제에 실패했습니다." };
  }
}
