/**
 * File Name : features/product/service/delete.ts
 * Description : 제품 삭제 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.15  임도헌   Created
 * 2025.06.15  임도헌   Modified  제품 삭제 함수 분리
 * 2025.11.19  임도헌   Modified  해당 제품 상세, 프로필 탭/카운트 캐시 초기화 추가
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 * 2026.01.20  임도헌   Modified  Controller 분리, 삭제된 제품 메타데이터 반환
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.02.22  임도헌   Modified  상품 삭제 시 유령 채팅방 방지를 위해 참여자 ID 목록 반환 추가
 * 2026.03.07  임도헌   Modified  삭제 실패 문구를 구체화(v1.2)
 * 2026.03.07  임도헌   Modified  정지 유저 가드 및 삭제 시 태그 count 정산 추가
 */
import "server-only";

import db from "@/lib/db";
import { validateUserStatus } from "@/features/user/service/admin";
import type { ServiceResult } from "@/lib/types";
import type { ProductDeleteMeta } from "@/features/product/types";

/**
 * 제품을 삭제
 * 소유자 권한을 검증한 후 DB에서 삭제하며, 삭제된 제품의 메타데이터를 반환
 *
 * @param {number} userId - 요청자 ID
 * @param {number} productId - 삭제할 제품 ID
 * @returns {Promise<ServiceResult<ProductDeleteMeta>>} 삭제된 제품 정보(캐시 무효화용)
 */
export async function deleteProduct(
  userId: number,
  productId: number
): Promise<ServiceResult<ProductDeleteMeta>> {
  try {
    const status = await validateUserStatus(userId);
    if (!status.success) return status;

    // 1. 제품 조회 및 권한 확인
    const product = await db.product.findUnique({
      where: { id: productId },
      select: {
        userId: true,
        purchase_userId: true,
        reservation_userId: true,
        search_tags: { select: { name: true } },
        chat_rooms: {
          select: { users: { select: { id: true } } },
        },
      },
    });

    if (!product) {
      return { success: false, error: "제품을 찾을 수 없습니다." };
    }

    if (product.userId !== userId) {
      return { success: false, error: "삭제 권한이 없습니다." };
    }

    // 채팅방 참여자 ID 중복 제거
    const chatUserIds = Array.from(
      new Set(product.chat_rooms.flatMap((room) => room.users.map((u) => u.id)))
    );

    // 2. 삭제 실행 + 태그 count 정산
    await db.$transaction(async (tx) => {
      if (product.search_tags.length > 0) {
        await Promise.all(
          product.search_tags.map((tag) =>
            tx.searchTag.updateMany({
              where: { name: tag.name, count: { gt: 0 } },
              data: { count: { decrement: 1 } },
            })
          )
        );
      }

      await tx.product.delete({ where: { id: productId } });
    });

    // 3. 메타데이터 반환 (캐시 태그 무효화에 필요)
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
  } catch (error) {
    console.error("deleteProduct Service Error:", error);
    return {
      success: false,
      error:
        "제품 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}
