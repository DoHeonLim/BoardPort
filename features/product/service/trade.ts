/**
 * File Name : features/product/service/trade.ts
 * Description : 제품 거래(상태/예약) 및 상호작용(좋아요) 로직
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.07  임도헌   Created
 * 2024.12.12  임도헌   Modified   select 필드 정리
 * 2025.05.23  임도헌   Modified   판매완료 판별 통합
 * 2025.10.08  임도헌   Moved      lib/product/updateProductStatus로 분리
 * 2025.10.19  임도헌   Modified   badge 판별 버그 수정 등
 * 2025.11.02  임도헌   Modified   권한검증 추가, SELLING 캐시 무효화 버그 수정, selectUserId 검증 보강,
 *                                이미지 URL 안전화, 알림 링크 경로 통일(/products/view/:id)
 * 2025.11.10  임도헌   Modified   Supabase 공용 채널→유저 전용 채널 전환, 실시간 payload에 image 포함
 * 2025.11.13  임도헌   Modified   중복예약 차단/판매완료 시 예약필드 정리 정책을 적용,
 *                                알림/푸시 allSettled, 에러 메시지 보강
 * 2025.12.02  임도헌   Modified   채팅 헤더 액션에서 사용하도록 시그니처 정리
 * 2025.12.03  임도헌   Modified   방해 금지 시간 정책 적용
 * 2025.12.07  임도헌   Modified   거래 기반 뱃지 체크를 badgeChecks.onTradeComplete로 통합
 * 2025.12.21  임도헌   Modified   Product 상태 유도(reservation/purchase) 전이 검증 강화,
 *                                isNotificationTypeEnabled/canSendPushForType 일괄 적용,
 *                                Push 성공 판정(sent>0)일 때만 Notification.isPushSent/sentAt 갱신
 * 2025.12.31  임도헌   Modified  SOLD 전환 시 badgeChecks.onTradeComplete(userId, role)로 호출 변경
 *                                (seller/buyer 역할별 뱃지 체크 분리)
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 * 2026.01.20  임도헌   Modified  lib/updateProductStatus -> service/trade (Service Layer 통합)
 * 2026.01.22  임도헌   Modified  Session 의존성 제거 (Controller 주입 방식 적용)
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.01.30  임도헌   Modified  좋아요 로직을 service/like.ts로 분리
 */

import "server-only";

import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { badgeChecks } from "@/features/user/service/badge";
import { sendPushNotification } from "@/features/notification/service/sender";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/utils/policy";
import type { ServiceResult } from "@/lib/types";
import type {
  ProductStatusMeta,
  ProductStatus,
} from "@/features/product/types";

// 내부 헬퍼: 푸시 전송 및 기록 (Best-effort)
async function sendPushAndMarkIfSent(params: {
  notificationId: number;
  targetUserId: number;
  title: string;
  message: string;
  url?: string;
  type: "TRADE";
  image?: string;
  tag?: string;
  renotify?: boolean;
  topic?: string;
}) {
  try {
    const result = await sendPushNotification({
      targetUserId: params.targetUserId,
      title: params.title,
      message: params.message,
      url: params.url,
      type: params.type,
      image: params.image,
      tag: params.tag,
      renotify: params.renotify,
      topic: params.topic,
    });

    const sent = (result as any)?.sent ?? 0;
    if (result?.success && sent > 0) {
      await db.notification.update({
        where: { id: params.notificationId },
        data: { isPushSent: true, sentAt: new Date() },
      });
    }
  } catch (err) {
    console.warn("[trade] push failed:", err);
  }
}

/**
 * 제품의 거래 상태를 변경합니다. (판매중 <-> 예약중 <-> 판매완료)
 * - 상태 변경 시 관련 알림(Push/In-App) 전송 및 뱃지 체크를 수행합니다.
 *
 * @param {number} userId - 요청자(판매자) ID
 * @param {number} productId - 제품 ID
 * @param {ProductStatus} status - 변경할 상태 ("selling" | "reserved" | "sold")
 * @param {number} [selectUserId] - 예약/판매 대상 구매자 ID (예약/판매완료 시 필수)
 * @returns {Promise<ServiceResult<ProductStatusMeta>>} 변경 결과 및 메타데이터
 */
export async function updateProductStatus(
  userId: number,
  productId: number,
  status: ProductStatus,
  selectUserId?: number
): Promise<ServiceResult<ProductStatusMeta>> {
  try {
    // 0. 권한 체크
    const owner = await db.product.findUnique({
      where: { id: productId },
      select: { userId: true },
    });

    if (!owner || owner.userId !== userId) {
      return { success: false, error: "권한이 없습니다." };
    }

    // ----------------------------------------------------------------------
    // Case 1: RESERVED (판매중 -> 예약중)
    // ----------------------------------------------------------------------
    if (status === "reserved") {
      if (!selectUserId) {
        return {
          success: false,
          error: "예약 전환에는 예약자를 선택해야 합니다.",
        };
      }

      const prev = await db.product.findUnique({
        where: { id: productId },
        select: { reservation_userId: true, purchase_userId: true },
      });

      if (!prev) return { success: false, error: "상품을 찾을 수 없습니다." };
      if (prev.purchase_userId) {
        return {
          success: false,
          error: "판매완료 상품은 예약으로 변경할 수 없습니다.",
        };
      }
      if (prev.reservation_userId) {
        return { success: false, error: "이미 예약 중인 상품입니다." };
      }

      // 채팅 검증 (채팅 이력이 있는 유저만 예약 가능)
      const validChat = await db.productChatRoom.findFirst({
        where: {
          productId,
          users: { some: { id: userId } },
          AND: [{ users: { some: { id: selectUserId } } }],
        },
        select: { id: true },
      });
      if (!validChat) {
        return {
          success: false,
          error: "채팅 내역이 없는 유저는 예약자로 지정할 수 없습니다.",
        };
      }

      // 업데이트 실행
      const updated = await db.product.update({
        where: { id: productId },
        data: {
          reservation_at: new Date(),
          reservation_userId: selectUserId,
          purchased_at: null,
          purchase_userId: null,
        },
        select: {
          title: true,
          images: { take: 1, select: { url: true } },
        },
      });

      // 알림 전송 (예약자에게)
      const imageUrl = updated.images?.[0]?.url
        ? `${updated.images[0]!.url}/public`
        : undefined;

      const pref = await db.notificationPreferences.findUnique({
        where: { userId: selectUserId },
      });

      if (!pref || isNotificationTypeEnabled(pref, "TRADE")) {
        const notification = await db.notification.create({
          data: {
            userId: selectUserId,
            title: "상품이 예약되었습니다",
            body: `${updated.title} 상품이 예약되었습니다.`,
            type: "TRADE",
            link: `/products/view/${productId}`,
            image: imageUrl,
            isPushSent: false,
          },
        });

        // Broadcast & Push (Best-effort)
        const tasks: Promise<any>[] = [];
        tasks.push(
          supabase.channel(`user-${selectUserId}-notifications`).send({
            type: "broadcast",
            event: "notification",
            payload: {
              userId: selectUserId,
              title: notification.title,
              body: notification.body,
              link: notification.link,
              type: notification.type,
              image: notification.image,
            },
          })
        );

        if (canSendPushForType(pref, "TRADE")) {
          tasks.push(
            sendPushAndMarkIfSent({
              notificationId: notification.id,
              targetUserId: selectUserId,
              title: notification.title,
              message: notification.body,
              url: notification.link ?? undefined,
              type: "TRADE",
              image: notification.image ?? undefined,
              tag: `bp-trade-${productId}`,
              renotify: true,
              topic: `bp-trade-${productId}`,
            })
          );
        }
        await Promise.allSettled(tasks);
      }

      return {
        success: true,
        data: {
          productId,
          sellerId: userId,
          buyerId: selectUserId,
          newStatus: "reserved",
        },
      };
    }

    // ----------------------------------------------------------------------
    // Case 2: SOLD (예약중 -> 판매완료)
    // ----------------------------------------------------------------------
    if (status === "sold") {
      const info = await db.product.findUnique({
        where: { id: productId },
        select: {
          reservation_userId: true,
          purchase_userId: true,
          title: true,
          images: { take: 1, select: { url: true } },
        },
      });

      if (!info) return { success: false, error: "상품을 찾을 수 없습니다." };
      if (info.purchase_userId) {
        return { success: false, error: "이미 판매완료된 상품입니다." };
      }
      if (!info.reservation_userId) {
        return {
          success: false,
          error: "예약자가 지정되어 있지 않아 판매완료로 전환할 수 없습니다.",
        };
      }

      const buyerId = info.reservation_userId;

      // 업데이트 실행 (구매자 확정, 예약 해제)
      await db.product.update({
        where: { id: productId },
        data: {
          purchased_at: new Date(),
          purchase_userId: buyerId,
          reservation_at: null,
          reservation_userId: null,
        },
      });

      const imageUrl = info.images?.[0]?.url
        ? `${info.images[0]!.url}/public`
        : undefined;

      // 뱃지 체크 (판매자/구매자 모두)
      await Promise.allSettled([
        badgeChecks.onTradeComplete(userId, "seller"),
        badgeChecks.onTradeComplete(buyerId, "buyer"),
      ]);

      // 알림 전송 (판매자/구매자)
      const prefsList = await db.notificationPreferences.findMany({
        where: { userId: { in: [userId, buyerId] } },
      });
      const prefMap = new Map<number, (typeof prefsList)[number]>();
      for (const p of prefsList) prefMap.set(p.userId, p);

      const sellerPref = prefMap.get(userId) ?? null;
      const buyerPref = prefMap.get(buyerId) ?? null;
      const tasks: Promise<any>[] = [];

      // 판매자 알림
      if (isNotificationTypeEnabled(sellerPref, "TRADE")) {
        const noti = await db.notification.create({
          data: {
            userId: userId,
            title: "상품이 판매되었습니다",
            body: `${info.title} 상품이 판매되었습니다.`,
            type: "TRADE",
            link: `/products/view/${productId}`,
            image: imageUrl,
          },
        });
        tasks.push(
          supabase.channel(`user-${userId}-notifications`).send({
            type: "broadcast",
            event: "notification",
            payload: {
              userId,
              title: noti.title,
              body: noti.body,
              link: noti.link,
              type: noti.type,
              image: noti.image,
            },
          })
        );
        if (canSendPushForType(sellerPref, "TRADE")) {
          tasks.push(
            sendPushAndMarkIfSent({
              notificationId: noti.id,
              targetUserId: userId,
              title: noti.title,
              message: noti.body,
              url: noti.link ?? undefined,
              type: "TRADE",
              image: noti.image ?? undefined,
              tag: `bp-trade-${productId}`,
              renotify: true,
              topic: `bp-trade-${productId}`,
            })
          );
        }
      }

      // 구매자 알림
      if (isNotificationTypeEnabled(buyerPref, "TRADE")) {
        const noti = await db.notification.create({
          data: {
            userId: buyerId,
            title: "상품 구매가 완료되었습니다",
            body: `${info.title} 상품의 구매가 완료되었습니다. 리뷰를 작성해주세요.`,
            type: "TRADE",
            link: `/profile/my-purchases`,
            image: imageUrl,
          },
        });
        tasks.push(
          supabase.channel(`user-${buyerId}-notifications`).send({
            type: "broadcast",
            event: "notification",
            payload: {
              userId: buyerId,
              title: noti.title,
              body: noti.body,
              link: noti.link,
              type: noti.type,
              image: noti.image,
            },
          })
        );
        if (canSendPushForType(buyerPref, "TRADE")) {
          tasks.push(
            sendPushAndMarkIfSent({
              notificationId: noti.id,
              targetUserId: buyerId,
              title: noti.title,
              message: noti.body,
              url: noti.link ?? undefined,
              type: "TRADE",
              image: noti.image ?? undefined,
              tag: `bp-trade-${productId}`,
              renotify: true,
              topic: `bp-trade-${productId}`,
            })
          );
        }
      }

      await Promise.allSettled(tasks);

      return {
        success: true,
        data: {
          productId,
          sellerId: userId,
          buyerId,
          newStatus: "sold",
        },
      };
    }

    // ----------------------------------------------------------------------
    // Case 3: SELLING (예약/판매완료 -> 판매중)
    // ----------------------------------------------------------------------
    const prev2 = await db.product.findUnique({
      where: { id: productId },
      select: {
        reservation_userId: true,
        purchase_userId: true,
        purchased_at: true,
        title: true,
        images: { take: 1, select: { url: true } },
      },
    });

    if (!prev2) return { success: false, error: "상품을 찾을 수 없습니다." };

    const oldPurchaseUserId = prev2.purchase_userId; // 판매완료였다면 구매자 ID 저장

    // 업데이트 실행 (초기화)
    await db.product.update({
      where: { id: productId },
      data: {
        purchased_at: null,
        purchase_userId: null,
        reservation_at: null,
        reservation_userId: null,
      },
    });

    // 예약 취소 알림 (예약 중이었던 경우만)
    const wasReserved =
      !!prev2.reservation_userId &&
      !prev2.purchase_userId &&
      !prev2.purchased_at;
    const canceledUserId = prev2.reservation_userId;

    if (wasReserved && canceledUserId) {
      const imageUrl = prev2.images?.[0]?.url
        ? `${prev2.images[0]!.url}/public`
        : undefined;
      const pref = await db.notificationPreferences.findUnique({
        where: { userId: canceledUserId },
      });

      if (!pref || isNotificationTypeEnabled(pref, "TRADE")) {
        const noti = await db.notification.create({
          data: {
            userId: canceledUserId,
            title: "상품 예약이 취소되었습니다",
            body: `${prev2.title} 상품의 예약이 취소되었습니다.`,
            type: "TRADE",
            link: `/products/view/${productId}`,
            image: imageUrl,
          },
        });

        const tasks: Promise<any>[] = [];
        tasks.push(
          supabase.channel(`user-${canceledUserId}-notifications`).send({
            type: "broadcast",
            event: "notification",
            payload: {
              userId: canceledUserId,
              title: noti.title,
              body: noti.body,
              link: noti.link,
              type: noti.type,
              image: noti.image,
            },
          })
        );

        if (canSendPushForType(pref, "TRADE")) {
          tasks.push(
            sendPushAndMarkIfSent({
              notificationId: noti.id,
              targetUserId: canceledUserId,
              title: noti.title,
              message: noti.body,
              url: noti.link ?? undefined,
              type: "TRADE",
              image: noti.image ?? undefined,
              tag: `bp-trade-${productId}`,
              renotify: true,
              topic: `bp-trade-${productId}`,
            })
          );
        }
        await Promise.allSettled(tasks);
      }
    }

    return {
      success: true,
      data: {
        productId,
        sellerId: userId,
        // 판매완료였다가 복귀한 경우, 구매자 탭 갱신을 위해 ID 전달
        buyerId: oldPurchaseUserId,
        newStatus: "selling",
      },
    };
  } catch (err) {
    console.error("updateProductStatus Service Error:", err);
    return { success: false, error: "상태 변경 중 오류가 발생했습니다." };
  }
}
