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
 * 2026.02.07  임도헌   Modified  정지 유저 가드(validateUserStatus) 적용
 * 2026.02.20  임도헌   Modified  후기 작성 완료 시 채팅방에 시스템 메시지 발송
 * 2026.03.07  임도헌   Modified  push 성공 판정 기준을 result.data.sent로 정정
 * 2026.03.07  임도헌   Modified  차단 관계에서는 리뷰 작성 불가하도록 가드 추가
 * 2026.04.03  임도헌   Modified  리뷰 생성 helper 주석 보강
 * 2026.06.21  임도헌   Modified  인앱 알림 더보기와 맞도록 리뷰 알림 본문 사전 축약 제거
 * 2026.08.21  임도헌   Modified  리뷰 알림·상품 채팅 발신을 서버 전용 private topic으로 전환
 */

import "server-only";

import db from "@/lib/db";
import { realtimeServer as supabase } from "@/features/realtime/service/broadcast";
import {
  notificationRealtimeTopic,
  productChatRealtimeTopic,
} from "@/features/realtime/topics";
import { isUniqueConstraintError } from "@/lib/errors";
import { badgeChecks } from "@/features/user/service/badge";
import { sendPushNotification } from "@/features/notification/service/sender";
import { validateUserStatus } from "@/features/user/service/admin";
import { checkBlockRelation } from "@/features/user/service/block";
import { mapToChatMessage } from "@/features/chat/utils/converter";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/utils/policy";
import { REVIEW_ERRORS } from "@/features/review/constants";
import { CreateReviewDTO } from "@/features/review/schemas";
import { ReviewServiceResult } from "@/features/review/types";

/**
 * 리뷰 알림 푸시를 전송하고 실제 발송 성공 시 notification 전송 상태를 갱신
 */
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

    if (result?.success && (result.data?.sent ?? 0) > 0) {
      await db.notification.update({
        where: { id: params.notificationId },
        data: { isPushSent: true, sentAt: new Date() },
      });
    }
  } catch (err) {
    console.warn("[ReviewService] Push failed:", err);
  }
}

function normalizeNotificationText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * 리뷰 생성
 *
 * @param {number} userId - 작성자 ID
 * @param {CreateReviewDTO} data - 리뷰 데이터 DTO
 * @returns {Promise<ReviewServiceResult>} 생성된 리뷰 정보 또는 에러
 */
export async function createReviewService(
  userId: number,
  data: CreateReviewDTO
): Promise<ReviewServiceResult> {
  try {
    // 작성자 상태 확인
    const status = await validateUserStatus(userId);
    if (!status.success) return { success: false, error: status.error! };

    // 제품 정보 조회
    // 판매자/구매자 관계와 알림 메타 확인 목적
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

    // 거래 상태 검증
    if (buyerId === null) {
      return { success: false, error: REVIEW_ERRORS.INVALID_STATUS };
    }

    // 거래 당사자 자격 검증
    if (data.type === "buyer") {
      if (buyerId !== userId)
        return { success: false, error: REVIEW_ERRORS.UNAUTHORIZED };
    } else {
      if (sellerId !== userId)
        return { success: false, error: REVIEW_ERRORS.UNAUTHORIZED };
    }

    const reviewTargetId = data.type === "buyer" ? sellerId : buyerId;
    if (await checkBlockRelation(userId, reviewTargetId)) {
      return {
        success: false,
        error: "차단 관계에서는 리뷰를 작성할 수 없습니다.",
      };
    }

    // 리뷰 생성
    // @@unique([userId, productId]) 기반 중복 작성 방지
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
      // 중복 리뷰 생성 경합 처리
      if (isUniqueConstraintError(e, ["userId", "productId"])) {
        return { success: false, error: REVIEW_ERRORS.ALREADY_EXISTS };
      }
      throw e;
    }

    // 후처리 비동기 실행
    // 사용자 응답 지연 방지를 위한 fire-and-forget 경로
    (async () => {
      // 리뷰 기반 뱃지 갱신
      const badgeTargetId = data.type === "buyer" ? sellerId : buyerId;
      const checkRole = data.type === "buyer" ? "buyer" : "seller";

      try {
        await badgeChecks.onReviewComplete(badgeTargetId, checkRole);
      } catch (e) {
        console.error("[ReviewService] Badge check failed:", e);
      }

      // 상대방 알림 전송
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
          const body = `${review.user.username}님이 ${
            prod.title
          }에 리뷰를 작성했습니다: "${normalizeNotificationText(data.payload)}"`;

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

          // In-app realtime 전송
          await supabase
            .channel(notificationRealtimeTopic(targetUserId))
            .send({
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

          // Push 전송
          if (canSendPushForType(pref, "REVIEW")) {
            await sendPush({
              notificationId: notification.id,
              targetUserId,
              title: notification.title,
              body: notification.body,
              link: notification.link!,
              image: imageUrl,
              tag: `bp-review-${data.productId}`,
            });
          }
        }
      } catch (e) {
        console.error("[ReviewService] Notification failed:", e);
      }

      // 채팅방 시스템 메시지 전송
      // 거래 당사자 채팅방에 리뷰 작성 완료 이력 기록
      try {
        const room = await db.productChatRoom.findFirst({
          where: {
            productId: data.productId,
            users: { some: { id: userId } },
            AND: [{ users: { some: { id: badgeTargetId } } }],
          },
          select: { id: true },
        });

        if (room) {
          const sysMsg = await db.productMessage.create({
            data: {
              type: "SYSTEM",
              userId: userId, // 리뷰 작성자를 메시지 주체로 기록
              productChatRoomId: room.id,
              payload: "거래 후기가 작성되었습니다. 소중한 의견 감사합니다! ⭐",
            },
            include: {
              user: { select: { id: true, username: true, avatar: true } },
            },
          });

          // 실시간 브로드캐스트
          await supabase.channel(productChatRealtimeTopic(room.id)).send({
            type: "broadcast",
            event: "message",
            payload: mapToChatMessage(sysMsg),
          });
        }
      } catch (chatErr) {
        console.error("[ReviewService] System message failed:", chatErr);
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
      meta: {
        productId: data.productId,
      },
    };
  } catch (error) {
    console.error("[ReviewService] Create Error:", error);
    return { success: false, error: REVIEW_ERRORS.SERVER_ERROR };
  }
}
