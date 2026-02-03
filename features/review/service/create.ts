/**
 * File Name : features/review/service/create.ts
 * Description : 리뷰 생성 비즈니스 로직 (DB, 알림, 뱃지)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2024.12.23  임도헌   Created    리뷰 생성/검증 로직 최초 구현
 * 2025.10.19  임도헌   Moved      app/(tabs)/profile/(product)/actions → lib/review/createReview 로 이동
 * 2025.11.05  임도헌   Modified   세션 기반 userId 강제, 자격 검증, 중복 방지, rate/payload 검증 강화
 * 2025.11.10  임도헌   Modified   유저 전용 채널 브로드캐스트 도입, push tag/renotify 적용
 * 2025.11.19  임도헌   Modified   제품 상세 캐시(product-detail) 무효화 추가
 * 2025.12.07  임도헌   Modified   리뷰 기반 뱃지 체크를 badgeChecks.onReviewComplete로 통합(best-effort)
 * 2025.12.21  임도헌   Modified   isNotificationTypeEnabled/canSendPushForType 사용,
 *                                 push 성공(sent>0)일 때만 Notification.isPushSent/sentAt 갱신
 * 2025.12.28  임도헌   Modified   seller 리뷰(판매자→구매자)도 buyer 평균평점/리뷰/뱃지 캐시 revalidate,
 *                                 Review @@unique(userId, productId) P2002 레이스 방어 추가
 * 2025.12.29  임도헌   Modified   중복 선조회(findFirst) 제거 → create + P2002 catch로 UX 통일,
 *                                 불필요 쿼리 1회 절감 및 커넥션 부담 완화
 * 2026.01.19  임도헌   Moved      lib/review -> features/review/lib
 * 2026.01.24  임도헌   Modified   lib/createReview.ts 로직 이관 및 최적화
 */

import "server-only";

import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { isUniqueConstraintError } from "@/lib/errors";
import { badgeChecks } from "@/features/user/service/badge";
import { sendPushNotification } from "@/features/notification/service/sender";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/utils/policy";
import { REVIEW_ERRORS } from "@/features/review/constants";
import { CreateReviewDTO } from "@/features/review/schemas";
import { ReviewServiceResult } from "@/features/review/types";

// 내부 유틸: 푸시 전송 (Fire-and-forget)
async function sendPush(params: {
  notificationId: number;
  targetUserId: number;
  title: string;
  body: string;
  link: string;
  image?: string;
  tag: string;
}) {
  try {
    const result = await sendPushNotification({
      targetUserId: params.targetUserId,
      title: params.title,
      message: params.body,
      url: params.link,
      type: "REVIEW",
      image: params.image,
      tag: params.tag,
      renotify: true,
      topic: params.tag,
    });

    if (result?.success && (result as any).sent > 0) {
      await db.notification.update({
        where: { id: params.notificationId },
        data: { isPushSent: true, sentAt: new Date() },
      });
    }
  } catch (err) {
    console.warn("[ReviewService] Push failed:", err);
  }
}

function buildPreview(text: string, max = 30) {
  const plain = text.replace(/\s+/g, " ").trim();
  return plain.length <= max ? plain : `${plain.slice(0, max)}...`;
}

/**
 * 리뷰 생성
 * - 제품 정보를 조회하여 판매자/구매자 관계를 검증합니다.
 * - 중복 작성을 방지하고 리뷰를 생성합니다.
 * - 뱃지 획득 여부를 체크하고 알림(In-App, Push)을 전송합니다.
 *
 * @param userId - 작성자 ID
 * @param data - 리뷰 데이터 DTO
 * @returns 생성된 리뷰 정보 또는 에러
 */
export async function createReviewService(
  userId: number,
  data: CreateReviewDTO
): Promise<ReviewServiceResult> {
  try {
    // 1. 제품 조회 (판매자/구매자 정보 확인)
    const prod = await db.product.findUnique({
      where: { id: data.productId },
      select: {
        id: true,
        title: true,
        userId: true, // sellerId
        purchase_userId: true, // buyerId
        images: { take: 1, select: { url: true } },
      },
    });

    if (!prod) {
      return { success: false, error: REVIEW_ERRORS.PRODUCT_NOT_FOUND };
    }

    const sellerId = prod.userId;
    const buyerId = prod.purchase_userId;

    // 2. 자격 검증 (Validation)
    // 2-1. 판매 완료 상태인지 확인 (구매자가 지정되어야 함)
    if (buyerId === null) {
      return { success: false, error: REVIEW_ERRORS.INVALID_STATUS };
    }

    // 2-2. 작성자가 해당 거래의 당사자(구매자 or 판매자)인지 확인
    if (data.type === "buyer") {
      if (buyerId !== userId)
        return { success: false, error: REVIEW_ERRORS.UNAUTHORIZED };
    } else {
      if (sellerId !== userId)
        return { success: false, error: REVIEW_ERRORS.UNAUTHORIZED };
    }

    // 3. 리뷰 생성 (DB Insert)
    // - @@unique([userId, productId]) 제약조건으로 중복 작성 방지
    let review;
    try {
      review = await db.review.create({
        data: {
          userId,
          productId: data.productId,
          payload: data.payload,
          rate: data.rate,
        },
        include: {
          user: { select: { username: true } },
        },
      });
    } catch (e) {
      // P2002 에러: 이미 리뷰가 존재함
      if (isUniqueConstraintError(e, ["userId", "productId"])) {
        return { success: false, error: REVIEW_ERRORS.ALREADY_EXISTS };
      }
      throw e;
    }

    // 4. 후처리 작업 (비동기 병렬 실행 - Fire & Forget)
    // - 리뷰 생성이 완료된 후에는 사용자 응답을 늦추지 않기 위해 비동기로 처리
    (async () => {
      // 4-1. 뱃지 획득 조건 체크
      // - 구매자가 리뷰를 씀 -> 판매자(sellerId)의 뱃지 체크
      // - 판매자가 리뷰를 씀 -> 구매자(buyerId)의 뱃지 체크
      const badgeTargetId = data.type === "buyer" ? sellerId : buyerId;
      const checkRole = data.type === "buyer" ? "buyer" : "seller";

      try {
        await badgeChecks.onReviewComplete(badgeTargetId, checkRole);
      } catch (e) {
        console.error("[ReviewService] Badge check failed:", e);
      }

      // 4-2. 알림 전송 (상대방에게)
      try {
        const targetUserId = badgeTargetId; // 리뷰 받은 사람
        const link =
          data.type === "buyer" ? "/profile/my-sales" : "/profile/my-purchases";
        const imageUrl = prod.images[0]?.url
          ? `${prod.images[0].url}/public`
          : undefined;

        // 알림 설정 확인
        const pref = await db.notificationPreferences.findUnique({
          where: { userId: targetUserId },
        });

        if (isNotificationTypeEnabled(pref, "REVIEW")) {
          const title = "새로운 리뷰가 작성되었습니다";
          const body = `${review.user.username}님이 ${prod.title}에 리뷰를 작성했습니다: "${buildPreview(data.payload)}"`;

          // DB 알림 저장
          const notification = await db.notification.create({
            data: {
              userId: targetUserId,
              title,
              body,
              type: "REVIEW",
              link,
              image: imageUrl,
              isPushSent: false,
            },
          });

          // In-App Realtime 전송
          await supabase.channel(`user-${targetUserId}-notifications`).send({
            type: "broadcast",
            event: "notification",
            payload: {
              id: notification.id,
              userId: targetUserId,
              title: notification.title,
              body: notification.body,
              link: notification.link,
              type: notification.type,
              image: notification.image,
              created_at: notification.created_at,
            },
          });

          // Push Notification 전송
          if (canSendPushForType(pref, "REVIEW")) {
            await sendPush({
              notificationId: notification.id,
              targetUserId,
              title: notification.title,
              body: notification.body,
              link,
              image: imageUrl,
              tag: `bp-review-${data.productId}`,
            });
          }
        }
      } catch (e) {
        console.error("[ReviewService] Notification failed:", e);
      }
    })();

    return {
      success: true,
      review: {
        id: review.id,
        rate: review.rate,
        payload: review.payload,
        userId: review.userId,
        productId: data.productId,
        created_at: review.created_at,
      },
    };
  } catch (error) {
    console.error("[ReviewService] Create Error:", error);
    return { success: false, error: REVIEW_ERRORS.SERVER_ERROR };
  }
}
