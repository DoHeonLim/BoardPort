/**
 * File Name : features/product/lib/updateProductStatus.ts
 * Description : 제품 상태 변경(판매중/예약중/판매완료) + 캐시 리밸리데이트/알림
 *
 * History
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
 */
"use server";

import { revalidateTag } from "next/cache";
import db from "@/lib/db";
import getSession from "@/lib/session";
import * as T from "@/lib/cacheTags";
import { supabase } from "@/lib/supabase";
import { badgeChecks } from "@/features/user/lib/badges";
import { sendPushNotification } from "@/features/notification/lib/push-notification";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/lib/policy";

/**
 * BoardPort Product 상태는 컬럼(status)로 저장하지 않고,
 * 아래 필드 조합으로 "유도"한다.
 *
 * - SELLING(판매중)  : reservation_userId == null && purchase_userId == null
 * - RESERVED(예약중) : reservation_userId != null && purchase_userId == null
 * - SOLD(판매완료)   : purchase_userId != null (보통 purchased_at도 함께 존재)
 *
 * 전이 정책(권장):
 * - selling  -> reserved : 예약자 지정 필요 + 이미 sold면 차단
 * - reserved -> sold     : 예약자 존재 필요 + 이미 sold면 차단 + sold 시 예약흔적 정리
 * - reserved/sold -> selling : 흔적 초기화(취소/번복) + 예약 취소인 경우 예약자에게 알림(옵션)
 */

type Status = "selling" | "reserved" | "sold";

interface UpdateProductStatusResult {
  success: boolean;
  error?: string;
  newStatus?: Status;
}

/* ---------------- Revalidate ---------------- */

function rvSellerTabsAndCounts(sellerId: number) {
  revalidateTag(T.USER_PRODUCTS_SCOPE_ID("SELLING", sellerId));
  revalidateTag(T.USER_PRODUCTS_SCOPE_ID("RESERVED", sellerId));
  revalidateTag(T.USER_PRODUCTS_SCOPE_ID("SOLD", sellerId));
  revalidateTag(T.USER_PRODUCTS_COUNTS_ID(sellerId));
}

function rvBuyerPurchasedAndCounts(buyerId: number) {
  revalidateTag(T.USER_PRODUCTS_SCOPE_ID("PURCHASED", buyerId));
  revalidateTag(T.USER_PRODUCTS_COUNTS_ID(buyerId));
}

/* ---------------- Push helpers ---------------- */

async function sendPushAndMarkIfSent(params: {
  notificationId: number;
  targetUserId: number;
  title: string;
  message: string;
  url?: string;
  type: "CHAT" | "TRADE" | "REVIEW" | "BADGE" | "SYSTEM" | "STREAM";
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
    // best-effort: 거래 상태 변경 자체는 실패시키지 않음
    console.warn("[updateProductStatus] push failed:", err);
  }
}

export async function updateProductStatus(
  productId: number,
  status: Status,
  selectUserId?: number
): Promise<UpdateProductStatusResult> {
  try {
    // 0) 세션/권한 체크 (판매자만 변경 가능)
    const session = await getSession();
    if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

    const owner = await db.product.findUnique({
      where: { id: productId },
      select: { userId: true },
    });

    if (!owner || owner.userId !== session.id) {
      return { success: false, error: "권한이 없습니다." };
    }

    /* ====================================================================== */
    /* 1) RESERVED (판매중 → 예약중)                                           */
    /* ====================================================================== */
    if (status === "reserved") {
      if (!selectUserId) {
        return {
          success: false,
          error: "예약 전환에는 예약자를 선택해야 합니다.",
        };
      }

      // 1-1) 현재 상태 조회 (전이 검증)
      const prev = await db.product.findUnique({
        where: { id: productId },
        select: {
          reservation_userId: true,
          purchase_userId: true,
        },
      });

      if (!prev) return { success: false, error: "상품을 찾을 수 없습니다." };

      // 이미 SOLD면 → reserved로 직접 전환 금지 (먼저 selling으로 되돌린 후 다시 예약)
      if (prev.purchase_userId) {
        return {
          success: false,
          error:
            "판매완료 상품은 예약으로 변경할 수 없습니다. 판매중으로 되돌린 후 다시 예약해주세요.",
        };
      }

      // 이미 RESERVED면 차단
      if (prev.reservation_userId) {
        return { success: false, error: "이미 예약 중인 상품입니다." };
      }

      // 1-2) "실제 채팅 상대"인지 검증 (예약자 임의 지정 방지)
      const validChatUser = await db.productChatRoom.findFirst({
        where: {
          productId,
          users: { some: { id: session.id } },
          AND: [{ users: { some: { id: selectUserId } } }],
        },
        select: { id: true },
      });

      if (!validChatUser) {
        return {
          success: false,
          error: "채팅 내역이 없는 유저는 예약자로 지정할 수 없습니다.",
        };
      }

      // 1-3) 예약 전환 업데이트
      // - reservation_* 설정
      // - 구매 흔적(purchased/purchase_user)은 항상 초기화(정책 고정)
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
          user: { select: { id: true } },
          images: { take: 1, select: { url: true } },
        },
      });

      const imageUrl = updated.images?.[0]?.url
        ? `${updated.images[0]!.url}/public`
        : undefined;

      // 1-4) 예약자 알림/푸시 (타입 OFF면 알림 row 자체도 생성하지 않음)
      const pref = await db.notificationPreferences.findUnique({
        where: { userId: selectUserId },
      });

      if (pref && !isNotificationTypeEnabled(pref, "TRADE")) {
        // 알림/푸시 모두 스킵 (거래 상태 변경은 정상 처리)
        rvSellerTabsAndCounts(updated.user.id);
        revalidateTag(T.PRODUCT_DETAIL_ID(productId));
        return { success: true, newStatus: "reserved" };
      }

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

      const canPush = canSendPushForType(pref, "TRADE");

      const tasks: Promise<any>[] = [];

      // in-app realtime
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

      // push (sent>0 일 때만 isPushSent/sentAt 갱신)
      if (canPush) {
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

      // 1-5) 캐시 무효화
      rvSellerTabsAndCounts(updated.user.id);
      revalidateTag(T.PRODUCT_DETAIL_ID(productId));

      return { success: true, newStatus: "reserved" };
    }

    /* ====================================================================== */
    /* 2) SOLD (예약중 → 판매완료)                                             */
    /* ====================================================================== */
    if (status === "sold") {
      // 2-1) 전이 검증용 상태 + 알림용 메타 조회
      const info = await db.product.findUnique({
        where: { id: productId },
        select: {
          reservation_userId: true,
          purchase_userId: true,
          title: true,
          user: { select: { id: true, username: true } },
          images: { take: 1, select: { url: true } },
        },
      });

      if (!info) return { success: false, error: "상품을 찾을 수 없습니다." };

      // 이미 SOLD면 재전환 차단
      if (info.purchase_userId) {
        return { success: false, error: "이미 판매완료된 상품입니다." };
      }

      // RESERVED 상태(예약자 존재)가 아니면 sold 불가
      if (!info.reservation_userId) {
        return {
          success: false,
          error:
            "구매자(예약자)가 지정되어 있지 않아 판매완료로 전환할 수 없습니다.",
        };
      }

      // 2-2) 판매완료 업데이트
      // - purchase_* 설정
      // - (정책) sold 시 예약 흔적 정리
      await db.product.update({
        where: { id: productId },
        data: {
          purchased_at: new Date(),
          purchase_userId: info.reservation_userId,
          reservation_at: null,
          reservation_userId: null,
        },
      });

      const sellerId = info.user.id;
      const buyerId = info.reservation_userId;

      const imageUrl = info.images?.[0]?.url
        ? `${info.images[0]!.url}/public`
        : undefined;

      // 2-3) 거래 기반 뱃지 체크는 best-effort (실패해도 거래 완료는 유지)
      await Promise.allSettled([
        badgeChecks.onTradeComplete(sellerId, "seller"),
        badgeChecks.onTradeComplete(buyerId, "buyer"),
      ]);

      // 2-4) 판매자/구매자 알림 설정
      const prefsList = await db.notificationPreferences.findMany({
        where: { userId: { in: [sellerId, buyerId] } },
      });

      const prefMap = new Map<number, (typeof prefsList)[number]>();
      for (const p of prefsList) prefMap.set(p.userId, p);

      const sellerPref = prefMap.get(sellerId) ?? null;
      const buyerPref = prefMap.get(buyerId) ?? null;

      let sellerNotification: Awaited<
        ReturnType<typeof db.notification.create>
      > | null = null;

      let buyerNotification: Awaited<
        ReturnType<typeof db.notification.create>
      > | null = null;

      // 판매자 알림 row
      if (isNotificationTypeEnabled(sellerPref, "TRADE")) {
        sellerNotification = await db.notification.create({
          data: {
            userId: sellerId,
            title: "상품이 판매되었습니다",
            body: `${info.title} 상품이 판매되었습니다.`,
            type: "TRADE",
            link: `/products/view/${productId}`,
            image: imageUrl,
            isPushSent: false,
          },
        });
      }

      // 구매자 알림 row
      if (isNotificationTypeEnabled(buyerPref, "TRADE")) {
        buyerNotification = await db.notification.create({
          data: {
            userId: buyerId,
            title: "상품 구매가 완료되었습니다",
            body: `${info.title} 상품의 구매가 완료되었습니다. 리뷰를 작성해주세요.`,
            type: "TRADE",
            link: `/profile/my-purchases`,
            image: imageUrl,
            isPushSent: false,
          },
        });
      }

      const tasks: Promise<any>[] = [];

      // 2-5) 판매자 in-app + push
      if (sellerNotification) {
        tasks.push(
          supabase.channel(`user-${sellerId}-notifications`).send({
            type: "broadcast",
            event: "notification",
            payload: {
              userId: sellerId,
              title: sellerNotification.title,
              body: sellerNotification.body,
              link: sellerNotification.link,
              type: sellerNotification.type,
              image: sellerNotification.image,
            },
          })
        );

        if (canSendPushForType(sellerPref, "TRADE")) {
          tasks.push(
            sendPushAndMarkIfSent({
              notificationId: sellerNotification.id,
              targetUserId: sellerId,
              title: sellerNotification.title,
              message: sellerNotification.body,
              url: sellerNotification.link ?? undefined,
              type: "TRADE",
              image: sellerNotification.image ?? undefined,
              tag: `bp-trade-${productId}`,
              renotify: true,
              topic: `bp-trade-${productId}`,
            })
          );
        }
      }

      // 2-6) 구매자 in-app + push
      if (buyerNotification) {
        tasks.push(
          supabase.channel(`user-${buyerId}-notifications`).send({
            type: "broadcast",
            event: "notification",
            payload: {
              userId: buyerId,
              title: buyerNotification.title,
              body: buyerNotification.body,
              link: buyerNotification.link,
              type: buyerNotification.type,
              image: buyerNotification.image,
            },
          })
        );

        if (canSendPushForType(buyerPref, "TRADE")) {
          tasks.push(
            sendPushAndMarkIfSent({
              notificationId: buyerNotification.id,
              targetUserId: buyerId,
              title: buyerNotification.title,
              message: buyerNotification.body,
              url: buyerNotification.link ?? undefined,
              type: "TRADE",
              image: buyerNotification.image ?? undefined,
              tag: `bp-trade-${productId}`,
              renotify: true,
              topic: `bp-trade-${productId}`,
            })
          );
        }
      }

      await Promise.allSettled(tasks);

      // 2-7) 캐시 무효화
      rvSellerTabsAndCounts(sellerId);
      rvBuyerPurchasedAndCounts(buyerId);
      revalidateTag(T.PRODUCT_DETAIL_ID(productId));

      // 프로필 리뷰/평점 캐시 무효화(양쪽)
      revalidateTag(T.USER_AVERAGE_RATING_ID(sellerId));
      revalidateTag(T.USER_REVIEWS_INITIAL_ID(sellerId));
      revalidateTag(T.USER_AVERAGE_RATING_ID(buyerId));
      revalidateTag(T.USER_REVIEWS_INITIAL_ID(buyerId));

      return { success: true, newStatus: "sold" };
    }

    /* ====================================================================== */
    /* 3) SELLING (예약중/판매완료 → 판매중)                                   */
    /* ====================================================================== */
    // selling 전환은 "취소/번복" 성격이므로,
    // reservation/purchase 흔적을 전부 초기화한다.
    const prev2 = await db.product.findUnique({
      where: { id: productId },
      select: {
        userId: true,
        reservation_userId: true,
        purchase_userId: true,
        purchased_at: true,
        title: true,
        images: { take: 1, select: { url: true } },
      },
    });

    if (!prev2) return { success: false, error: "상품을 찾을 수 없습니다." };

    const imageUrl = prev2.images?.[0]?.url
      ? `${prev2.images[0]!.url}/public`
      : undefined;

    // 3-1) 상태 초기화(판매중으로 복귀)
    await db.product.update({
      where: { id: productId },
      data: {
        purchased_at: null,
        purchase_userId: null,
        reservation_at: null,
        reservation_userId: null,
      },
    });

    /**
     * 3-2) 예약 취소 알림
     * - "예약중이었다가 판매중으로 복귀"하는 경우에만 예약자에게 알려준다.
     * - 이미 sold(구매자 존재)였던 상태를 selling으로 되돌리는 경우는 "환불/취소" 성격이라
     *   여기서는 별도의 알림 정책을 강제하지 않는다(필요하면 별도 플로우로 분리 권장).
     */
    const wasReserved =
      !!prev2.reservation_userId &&
      !prev2.purchase_userId &&
      !prev2.purchased_at;

    if (wasReserved && prev2.reservation_userId) {
      const pref = await db.notificationPreferences.findUnique({
        where: { userId: prev2.reservation_userId },
      });

      // TRADE 타입 OFF면 알림 row 자체도 생성하지 않음
      if (!pref || isNotificationTypeEnabled(pref, "TRADE")) {
        const cancelNotification = await db.notification.create({
          data: {
            userId: prev2.reservation_userId,
            title: "상품 예약이 취소되었습니다",
            body: `${prev2.title} 상품의 예약이 취소되었습니다.`,
            type: "TRADE",
            link: `/products/view/${productId}`,
            image: imageUrl,
            isPushSent: false,
          },
        });

        const tasks: Promise<any>[] = [];

        tasks.push(
          supabase
            .channel(`user-${prev2.reservation_userId}-notifications`)
            .send({
              type: "broadcast",
              event: "notification",
              payload: {
                userId: prev2.reservation_userId,
                title: cancelNotification.title,
                body: cancelNotification.body,
                link: cancelNotification.link,
                type: cancelNotification.type,
                image: cancelNotification.image,
              },
            })
        );

        if (canSendPushForType(pref, "TRADE")) {
          tasks.push(
            sendPushAndMarkIfSent({
              notificationId: cancelNotification.id,
              targetUserId: prev2.reservation_userId,
              title: cancelNotification.title,
              message: cancelNotification.body,
              url: cancelNotification.link ?? undefined,
              type: "TRADE",
              image: cancelNotification.image ?? undefined,
              tag: `bp-trade-${productId}`,
              renotify: true,
              topic: `bp-trade-${productId}`,
            })
          );
        }

        await Promise.allSettled(tasks);
      }
    }

    // 3-3) 캐시 무효화
    rvSellerTabsAndCounts(prev2.userId);

    // 판매완료였다가 selling으로 되돌린 경우, 구매자 탭에서도 빠져야 하므로 revalidate
    if (prev2.purchase_userId) rvBuyerPurchasedAndCounts(prev2.purchase_userId);

    revalidateTag(T.PRODUCT_DETAIL_ID(productId));

    return { success: true, newStatus: "selling" };
  } catch (err) {
    console.error("상품 상태 업데이트 중 오류:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "상품 상태 업데이트에 실패했습니다.",
    };
  }
}
