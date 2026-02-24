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
 * 2026.02.20  임도헌   Modified  상태 변경 시 해당 유저와의 채팅방에 SYSTEM 메시지 발송 로직 추가
 * 2026.02.22  임도헌   Modified  예약 취소(SELLING 복귀) 시 확정된 약속(ACCEPTED) 자동 취소 연동 및 JSDoc 최신화
 * 2026.02.23  임도헌   Modified  동시성 충돌(Race Condition) 방어를 위한 updateMany 기반 원자적 트랜잭션 적용
 */

import "server-only";

import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { badgeChecks } from "@/features/user/service/badge";
import {
  sendPushNotification,
  SendPushResult,
} from "@/features/notification/service/sender";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/utils/policy";
import { mapToChatMessage } from "@/features/chat/utils/converter";
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
    const result = (await sendPushNotification({
      targetUserId: params.targetUserId,
      title: params.title,
      message: params.message,
      url: params.url,
      type: params.type,
      image: params.image,
      tag: params.tag,
      renotify: params.renotify,
      topic: params.topic,
    })) as ServiceResult<SendPushResult>;

    if (result?.success && result.data.sent > 0) {
      await db.notification.update({
        where: { id: params.notificationId },
        data: { isPushSent: true, sentAt: new Date() },
      });
    }
  } catch (err) {
    console.warn("[trade] push failed:", err);
  }
}

// 내부 헬퍼: 채팅방 시스템 메시지 발송
async function dispatchSystemMessage(
  productId: number,
  sellerId: number,
  targetUserId: number,
  text: string
) {
  try {
    // 1. 두 유저가 포함된 해당 상품의 채팅방 찾기
    const room = await db.productChatRoom.findFirst({
      where: {
        productId,
        users: { some: { id: sellerId } },
        AND: [{ users: { some: { id: targetUserId } } }],
      },
      select: { id: true },
    });

    if (!room) return;

    // 2. 시스템 메시지 생성
    const sysMsg = await db.productMessage.create({
      data: {
        type: "SYSTEM",
        userId: sellerId, // 상태를 바꾼 사람을 기준으로
        productChatRoomId: room.id,
        payload: text,
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });

    // 3. 브로드캐스트
    await supabase.channel(`room-${room.id}`).send({
      type: "broadcast",
      event: "message",
      payload: mapToChatMessage(sysMsg),
    });
  } catch (err) {
    console.warn("[System Message] Failed to send:", err);
  }
}

/**
 * 제품의 거래 상태 변경 (판매중 <-> 예약중 <-> 판매완료)
 *
 * [원자성 및 동시성 제어]
 * - 단순 `findUnique` 후 `update` 방식은 TOCTOU(Time-of-check to time-of-use) 취약점이 발생할 수 있음
 * - 따라서 `updateMany`에 상태 조건을 명시하여 다른 스레드에서 동시에 접근하지 못하게 원천 차단함
 *
 * [상태별 로직]
 * 1. Case: RESERVED (판매중 -> 예약중)
 *    - 본인을 예약자로 지정하는 API 조작 시도를 차단
 *    - 상품 상태 업데이트 + 타 채팅방의 PENDING 약속 일괄 취소
 *    - 행위자(actorId)가 아닌 상대방에게 알림 전송
 *
 * 2. Case: SOLD (예약중 -> 판매완료)
 *    - 상품 상태 업데이트 (구매자 확정) + 잔여 PENDING 약속 일괄 취소
 *    - 판매자와 구매자 각각에게 맞춤형 템플릿으로 알림 전송 (본인 제외)
 *
 * 3. Case: SELLING (예약/판매완료 -> 판매중 복귀)
 *    - 상품 상태 초기화 + 기존 작성된 리뷰 일괄 삭제 + 확정된 약속(ACCEPTED) 자동 취소
 *    - 취소 대상자(예약자/구매자)에게 취소 알림 전송
 *
 * @param userId - 요청자(판매자) ID
 * @param productId - 제품 ID
 * @param status - 변경할 상태 ("selling" | "reserved" | "sold")
 * @param selectUserId - 예약/판매 대상 유저 ID
 * @param options - 부가 옵션 (skipSystemMessage, actorId)
 */
export async function updateProductStatus(
  userId: number,
  productId: number,
  status: ProductStatus,
  selectUserId?: number,
  options?: { skipSystemMessage?: boolean; actorId?: number }
): Promise<ServiceResult<ProductStatusMeta>> {
  try {
    const owner = await db.product.findUnique({
      where: { id: productId },
      select: { userId: true },
    });

    if (!owner || owner.userId !== userId) {
      return { success: false, error: "권한이 없습니다." };
    }

    const { skipSystemMessage = false, actorId = userId } = options || {};

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

      // 자기 자신을 예약자로 지정하는 API 조작 차단
      if (selectUserId === userId) {
        return {
          success: false,
          error: "자기 자신을 예약자로 지정할 수 없습니다.",
        };
      }

      // 채팅 내역 검증 (채팅을 한 적이 있는 유저만 예약자로 지정 가능)
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

      // 트랜잭션: 원자적 업데이트 및 펜딩 약속 일괄 취소
      const { updatedProduct, affectedApts } = await db.$transaction(
        async (tx) => {
          // 동시성 제어: 현재 예약자나 구매자가 없을 때만 예약중으로 변경
          const updatedResult = await tx.product.updateMany({
            where: {
              id: productId,
              reservation_userId: null,
              purchase_userId: null,
            },
            data: {
              reservation_at: new Date(),
              reservation_userId: selectUserId,
              purchased_at: null,
              purchase_userId: null,
            },
          });

          if (updatedResult.count === 0) {
            throw new Error("ALREADY_PROCESSED");
          }

          // 업데이트된 데이터 확보 (알림 썸네일/타이틀용)
          const productData = await tx.product.findUnique({
            where: { id: productId },
            select: { title: true, images: { take: 1, select: { url: true } } },
          });

          // 해당 상품의 다른 PENDING 약속들 취소
          const pendingApts = await tx.appointment.findMany({
            where: { chatRoom: { productId }, status: "PENDING" },
            select: { id: true, chatRoomId: true },
          });

          if (pendingApts.length > 0) {
            await tx.appointment.updateMany({
              where: { id: { in: pendingApts.map((a) => a.id) } },
              data: { status: "CANCELED" },
            });
          }
          return { updatedProduct: productData!, affectedApts: pendingApts };
        }
      );

      // 브로드캐스트 (트랜잭션 외부)
      for (const apt of affectedApts) {
        await supabase.channel(`room-${apt.chatRoomId}`).send({
          type: "broadcast",
          event: "appointment_update",
          payload: { id: apt.id, status: "CANCELED" },
        });
      }

      if (!skipSystemMessage) {
        void dispatchSystemMessage(
          productId,
          userId,
          selectUserId,
          "예약자로 지정되었습니다. 상품 상태가 '예약중'으로 변경됩니다."
        );
      }

      // 알림 발송 (행위자가 아닌 상대방에게만)
      const targetNotiId = actorId === selectUserId ? userId : selectUserId;
      const imageUrl = updatedProduct.images?.[0]?.url
        ? `${updatedProduct.images[0].url}/public`
        : undefined;

      const pref = await db.notificationPreferences.findUnique({
        where: { userId: targetNotiId },
      });

      if (!pref || isNotificationTypeEnabled(pref, "TRADE")) {
        const notification = await db.notification.create({
          data: {
            userId: targetNotiId,
            title: "상품이 예약되었습니다",
            body: `'${updatedProduct.title}' 상품의 거래 약속이 확정되었습니다.`,
            type: "TRADE",
            link: `/products/view/${productId}`,
            image: imageUrl,
            isPushSent: false,
          },
        });

        const tasks: Promise<any>[] = [];
        tasks.push(
          supabase.channel(`user-${targetNotiId}-notifications`).send({
            type: "broadcast",
            event: "notification",
            payload: {
              userId: targetNotiId,
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
              targetUserId: targetNotiId,
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
      // 판매완료 대상이 되는 예약자 정보 사전 조회
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
      if (!info.reservation_userId) {
        return {
          success: false,
          error: "예약자가 지정되어 있지 않아 판매완료로 전환할 수 없습니다.",
        };
      }

      const buyerId = info.reservation_userId;

      // 트랜잭션: 원자적 업데이트 및 PENDING 상태 약속 정리
      const affectedApts = await db.$transaction(async (tx) => {
        // 예약 상태인 것만 판매완료로 전환
        const updatedResult = await tx.product.updateMany({
          where: {
            id: productId,
            purchase_userId: null,
            reservation_userId: { not: null },
          },
          data: {
            purchased_at: new Date(),
            purchase_userId: buyerId,
            reservation_at: null,
            reservation_userId: null,
          },
        });

        if (updatedResult.count === 0) {
          throw new Error("ALREADY_PROCESSED");
        }

        const pendingApts = await tx.appointment.findMany({
          where: { chatRoom: { productId }, status: "PENDING" },
          select: { id: true, chatRoomId: true },
        });

        if (pendingApts.length > 0) {
          await tx.appointment.updateMany({
            where: { id: { in: pendingApts.map((a) => a.id) } },
            data: { status: "CANCELED" },
          });
        }
        return pendingApts;
      });

      for (const apt of affectedApts) {
        await supabase.channel(`room-${apt.chatRoomId}`).send({
          type: "broadcast",
          event: "appointment_update",
          payload: { id: apt.id, status: "CANCELED" },
        });
      }

      if (!skipSystemMessage) {
        void dispatchSystemMessage(
          productId,
          userId,
          buyerId,
          "거래가 완료되었습니다. 서로에게 따뜻한 거래 후기를 남겨주세요! ⭐"
        );
      }

      const imageUrl = info.images?.[0]?.url
        ? `${info.images[0].url}/public`
        : undefined;

      // 양측 뱃지 체크
      await Promise.allSettled([
        badgeChecks.onTradeComplete(userId, "seller"),
        badgeChecks.onTradeComplete(buyerId, "buyer"),
      ]);

      // 양측 알림 설정 조회 및 발송
      const prefsList = await db.notificationPreferences.findMany({
        where: { userId: { in: [userId, buyerId] } },
      });
      const prefMap = new Map(prefsList.map((p) => [p.userId, p]));

      const sellerPref = prefMap.get(userId) ?? null;
      const buyerPref = prefMap.get(buyerId) ?? null;
      const tasks: Promise<any>[] = [];

      // 판매자 알림 (본인이 누른게 아닐 때만)
      if (
        userId !== actorId &&
        isNotificationTypeEnabled(sellerPref, "TRADE")
      ) {
        const noti = await db.notification.create({
          data: {
            userId: userId,
            title: "상품이 판매되었습니다",
            body: `'${info.title}' 상품이 판매되었습니다.`,
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
            })
          );
        }
      }

      // 구매자 알림 (본인이 누른게 아닐 때만)
      if (
        buyerId !== actorId &&
        isNotificationTypeEnabled(buyerPref, "TRADE")
      ) {
        const noti = await db.notification.create({
          data: {
            userId: buyerId,
            title: "상품 구매가 완료되었습니다",
            body: `'${info.title}' 상품의 구매가 완료되었습니다. 리뷰를 작성해주세요.`,
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
            })
          );
        }
      }

      await Promise.allSettled(tasks);

      return {
        success: true,
        data: { productId, sellerId: userId, buyerId, newStatus: "sold" },
      };
    }

    // ----------------------------------------------------------------------
    // Case 3: SELLING (예약/판매완료 -> 판매중 복귀)
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

    const oldPurchaseUserId = prev2.purchase_userId;
    const canceledUserId = prev2.reservation_userId || prev2.purchase_userId;

    const affectedApts = await db.$transaction(async (tx) => {
      // 판매중 복귀: 이미 예약중이거나 판매완료 상태인 경우만
      const updatedResult = await tx.product.updateMany({
        where: {
          id: productId,
          OR: [
            { reservation_userId: { not: null } },
            { purchase_userId: { not: null } },
          ],
        },
        data: {
          purchased_at: null,
          purchase_userId: null,
          reservation_at: null,
          reservation_userId: null,
        },
      });

      if (updatedResult.count === 0) {
        throw new Error("ALREADY_PROCESSED");
      }

      // 리뷰 일괄 삭제 (거래 취소 시 평가 제거)
      await tx.review.deleteMany({ where: { productId } });

      // 확정된(ACCEPTED) 약속을 CANCELED 처리
      const apts = await tx.appointment.findMany({
        where: { chatRoom: { productId }, status: "ACCEPTED" },
        select: { id: true, chatRoomId: true },
      });

      if (apts.length > 0) {
        await tx.appointment.updateMany({
          where: { id: { in: apts.map((a) => a.id) } },
          data: { status: "CANCELED" },
        });
      }
      return apts;
    });

    for (const apt of affectedApts) {
      await supabase.channel(`room-${apt.chatRoomId}`).send({
        type: "broadcast",
        event: "appointment_update",
        payload: { id: apt.id, status: "CANCELED" },
      });
    }

    if (canceledUserId && !skipSystemMessage) {
      void dispatchSystemMessage(
        productId,
        userId,
        canceledUserId,
        "예약이 취소되어 상품이 다시 '판매중'으로 변경되었습니다."
      );
    }

    const wasReserved =
      !!prev2.reservation_userId &&
      !prev2.purchase_userId &&
      !prev2.purchased_at;

    // 취소 대상자(canceledUserId)가 행위자(actorId)가 아닐 때만 알림 전송
    if (wasReserved && canceledUserId && canceledUserId !== actorId) {
      const imageUrl = prev2.images?.[0]?.url
        ? `${prev2.images[0].url}/public`
        : undefined;
      const pref = await db.notificationPreferences.findUnique({
        where: { userId: canceledUserId },
      });

      if (!pref || isNotificationTypeEnabled(pref, "TRADE")) {
        const noti = await db.notification.create({
          data: {
            userId: canceledUserId,
            title: "상품 예약이 취소되었습니다",
            body: `'${prev2.title}' 상품의 예약이 취소되었습니다.`,
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
        buyerId: oldPurchaseUserId,
        newStatus: "selling",
      },
    };
  } catch (err: any) {
    if (err.message === "ALREADY_PROCESSED") {
      return { success: false, error: "이미 상태가 변경되었습니다." };
    }
    console.error("updateProductStatus Service Error:", err);
    return { success: false, error: "상태 변경 중 오류가 발생했습니다." };
  }
}
