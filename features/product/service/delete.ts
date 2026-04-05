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
 * 2026.03.31  임도헌   Modified  일반 삭제/관리자 삭제 공통 cleanup helper와 Cloudflare 이미지 자산 정리 추가
 * 2026.04.02  임도헌   Modified  Cloudflare imageId 추출 유틸 분리 및 보조 함수 JSDoc 보강
 * 2026.04.04  임도헌   Modified  삭제 대상 조회/cleanup/메타 반환 단계의 인라인 주석 보강
 */
import "server-only";

import db from "@/lib/db";
import { validateUserStatus } from "@/features/user/service/admin";
import { extractCloudflareImageId } from "@/features/product/utils/image";
import type { ServiceResult } from "@/lib/types";
import type { ProductDeleteMeta } from "@/features/product/types";

/**
 * Cloudflare Images 자산 삭제 best-effort 요청
 *
 * [동작]
 * - 제품 원본 이미지 URL에서 imageId를 추출한 뒤 Cloudflare Images API로 DELETE 요청 전송
 * - 계정 설정 누락, imageId 미추출, 404 응답은 조용히 무시
 * - 네트워크 오류나 비정상 응답은 로그만 남기고 제품 삭제 흐름은 계속 진행
 *
 * @param {string} imageUrl - 삭제 대상 제품 이미지 URL
 * @returns {Promise<void>} 반환값 없음
 */
export async function deleteCloudflareImageAsset(
  imageUrl: string
): Promise<void> {
  const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
  const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
  const imageId = extractCloudflareImageId(imageUrl);

  if (!ACCOUNT_ID || !API_TOKEN || !imageId) return;

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1/${imageId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      console.warn(
        `[deleteCloudflareImageAsset] unexpected status=${response.status} url=${imageUrl}`
      );
    }
  } catch (error) {
    console.error("[deleteCloudflareImageAsset] failed:", error);
  }
}

type HardDeleteProductTarget = {
  id: number;
  search_tags: { name: string }[];
  images: { url: string }[];
};

/**
 * 상품 하드 삭제 공통 cleanup
 *
 * [기능]
 * - 일반 삭제/관리자 삭제가 같은 태그 count 정산 규칙을 공유
 * - 삭제 후 사용처가 없어진 태그(count <= 0)는 함께 정리
 * - DB 삭제 완료 뒤 Cloudflare Images 자산을 best-effort로 정리
 */
export async function hardDeleteProductWithCleanup(
  target: HardDeleteProductTarget
) {
  // 태그/이미지 cleanup용 원시 목록 추출
  const tagNames = target.search_tags.map((tag) => tag.name);
  const imageUrls = target.images.map((image) => image.url);

  await db.$transaction(async (tx) => {
    // 연결된 태그 count 감소
    if (tagNames.length > 0) {
      await Promise.all(
        tagNames.map((tag) =>
          tx.searchTag.updateMany({
            where: { name: tag, count: { gt: 0 } },
            data: { count: { decrement: 1 } },
          })
        )
      );
    }

    // 상품 본문 하드 삭제
    await tx.product.delete({ where: { id: target.id } });

    // 사용처가 사라진 태그 정리
    if (tagNames.length > 0) {
      await tx.searchTag.deleteMany({
        where: {
          name: { in: tagNames },
          count: { lte: 0 },
        },
      });
    }
  });

  // DB 삭제 이후 이미지 자산 best-effort 정리
  await Promise.allSettled(
    imageUrls.map((imageUrl) => deleteCloudflareImageAsset(imageUrl))
  );
}

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
    // 정지 유저 삭제 차단
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
        images: { select: { url: true } },
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

    // 상품 삭제와 태그/이미지 cleanup 실행
    await hardDeleteProductWithCleanup({
      id: productId,
      search_tags: product.search_tags,
      images: product.images,
    });

    // 후속 캐시 무효화용 메타데이터 반환
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
