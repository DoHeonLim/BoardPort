/**
 * File Name : features/product/service/like.ts
 * Description : 제품 좋아요(찜하기) 관리 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   Created   service/trade.ts에서 분리
 * 2026.02.05  임도헌   Modified  좋아요 시 차단 관계 확인 로직 추가
 * 2026.03.04  임도헌   Modified  getCachedProductLikeStatus 대신 getProductLikeStatus 순수 함수로 변경
 * 2026.03.06  임도헌   Modified  좋아요 추가 시 판매자 대상 알림(인앱 + 설정 기반 푸시) 발송 로직 추가
 * 2026.03.06  임도헌   Modified  동일 유저의 좋아요 토글 스팸 방지를 위한 알림 쿨다운(10분) 검증 로직 추가
 * 2026.03.06  임도헌   Modified  주석 최신화
 * 
 */
import "server-only";

import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import type { ServiceResult } from "@/lib/types";
import type { ProductLikeResult } from "@/features/product/types";
import { checkBlockRelation } from "@/features/user/service/block";
import { isUniqueConstraintError } from "@/lib/errors";
import { sendPushNotification } from "@/features/notification/service/sender";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/utils/policy";

// 알림 스팸 방지용 쿨다운
const LIKE_NOTIFICATION_COOLDOWN_MS = 10 * 60 * 1000; // 10분

/**
 * 제품 좋아요 상태 및 카운트 조회 로직
 *
 * [데이터 가공 전략]
 * - 해당 제품의 총 좋아요 수(`likeCount`)와 요청 유저의 좋아요 누름 여부(`isLiked`) 병렬 집계
 * - 비로그인(userId가 null) 상태일 경우 `isLiked`를 false로 즉시 반환
 *
 * @param {number} productId - 제품 ID
 * @param {number | null} userId - 조회하는 유저 ID
 * @returns {Promise<ProductLikeResult>} 좋아요 여부 및 총 개수 객체 반환
 */
export async function getProductLikeStatus(
  productId: number,
  userId: number | null
): Promise<ProductLikeResult> {
  const likeCount = await db.productLike.count({ where: { productId } });
  let isLiked = false;

  if (userId) {
    const exist = await db.productLike.findUnique({
      where: { id: { productId, userId } },
    });
    isLiked = !!exist;
  }

  return { likeCount, isLiked };
}

/**
 * 판매자에게 좋아요 알림을 보낼지 여부를 판단
 *
 * [동작]
 * - 동일 판매자(sellerId) + 동일 상품(productId) + 동일 찜한 유저(likerName) 조합으로
 *   최근 N분 내(기본 10분) 같은 TRADE 알림이 있었는지 확인
 * - 최근 알림이 있으면 false(알림 생략), 없으면 true(알림 발송) 반환
 *
 * @param params.sellerId - 알림 수신자(판매자) ID
 * @param params.productId - 상품 ID
 * @param params.likerName - 좋아요를 누른 유저 닉네임
 * @returns {Promise<boolean>} 알림 발송 가능 여부
 */
async function shouldSendLikeNotification(params: {
  sellerId: number;
  productId: number;
  likerName: string;
}): Promise<boolean> {
  const { sellerId, productId, likerName } = params;
  const since = new Date(Date.now() - LIKE_NOTIFICATION_COOLDOWN_MS);

  const recent = await db.notification.findFirst({
    where: {
      userId: sellerId,
      type: "TRADE",
      title: "새 관심 신호가 도착했어요",
      link: `/products/view/${productId}`,
      created_at: { gte: since },
      body: { startsWith: `${likerName}님이 '` },
    },
    select: { id: true },
  });

  return !recent;
}

/**
 * 판매자에게 "찜 추가" 알림 발송
 * - 인앱 알림(DB + broadcast)
 * - 푸시 알림은 설정 허용 시에만 전송
 */
async function notifySellerOnLike(params: {
  sellerId: number;
  likerId: number;
  likerName: string;
  productId: number;
  productTitle: string;
  image?: string;
}) {
  const { sellerId, likerId, likerName, productId, productTitle, image } =
    params;

  // 본인 상품 찜은 알림 제외
  if (sellerId === likerId) return;

  // 쿨다운 내 동일 유저 재토글 알림 차단
  const canNotify = await shouldSendLikeNotification({
    sellerId,
    productId,
    likerName,
  });
  if (!canNotify) return;

  const pref = await db.notificationPreferences.findUnique({
    where: { userId: sellerId },
  });

  // 앱 내 알림 비활성 시 종료
  if (pref && !isNotificationTypeEnabled(pref, "TRADE")) return;

  const link = `/products/view/${productId}`;
  const title = "새 관심 신호가 도착했어요";
  const body = `${likerName}님이 '${productTitle}' 상품을 찜했습니다.`;

  const notification = await db.notification.create({
    data: {
      userId: sellerId,
      title,
      body,
      type: "TRADE",
      link,
      image,
      isPushSent: false,
    },
  });

  await supabase.channel(`user-${sellerId}-notifications`).send({
    type: "broadcast",
    event: "notification",
    payload: {
      id: notification.id,
      userId: sellerId,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      type: notification.type,
      image: notification.image,
      created_at: notification.created_at,
    },
  });

  if (canSendPushForType(pref, "TRADE")) {
    const pushRes = await sendPushNotification({
      targetUserId: sellerId,
      title,
      message: body,
      url: link,
      type: "TRADE",
      image,
      tag: `product-liked-${productId}`,
      renotify: false,
    });

    if (pushRes.success && (pushRes.data?.sent ?? 0) > 0) {
      await db.notification.update({
        where: { id: notification.id },
        data: { isPushSent: true, sentAt: new Date() },
      });
    }
  }
}

/**
 * 제품 좋아요 추가/취소 처리 로직
 *
 * [데이터 가공 및 권한 제어 전략]
 * - 제품 소유자 조회 및 판매자와 요청 유저 간 양방향 차단 관계 검증 (차단 시 상호작용 불가 처리)
 * - `isLike` 플래그에 따른 DB Create 또는 Delete 수행
 * - 동시 요청으로 인한 Prisma Unique Constraint Error (P2002) 발생 시 멱등성 보장을 위한 예외 무시 처리
 *
 * @param {number} userId - 요청 유저 ID
 * @param {number} productId - 대상 제품 ID
 * @param {boolean} isLike - true(추가), false(취소)
 * @returns {Promise<ServiceResult>} 처리 결과 객체 반환
 */
export async function toggleProductLike(
  userId: number,
  productId: number,
  isLike: boolean
): Promise<ServiceResult> {
  try {
    const [product, liker] = await Promise.all([
      db.product.findUnique({
        where: { id: productId },
        select: {
          userId: true,
          title: true,
          images: {
            where: { order: 0 },
            take: 1,
            select: { url: true },
          },
        },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { username: true },
      }),
    ]);

    if (!product) return { success: false, error: "제품을 찾을 수 없습니다." };
    if (!liker)
      return { success: false, error: "사용자 정보를 찾을 수 없습니다." };

    // 차단 체크
    const isBlocked = await checkBlockRelation(userId, product.userId);
    if (isBlocked) {
      return {
        success: false,
        error: "차단된 사용자와는 상호작용할 수 없습니다.",
      };
    }

    if (isLike) {
      await db.productLike.create({
        data: {
          user: { connect: { id: userId } },
          product: { connect: { id: productId } },
        },
      });

      // 좋아요 "추가" 성공 시에만 판매자 알림
      await notifySellerOnLike({
        sellerId: product.userId,
        likerId: userId,
        likerName: liker.username,
        productId,
        productTitle: product.title,
        image: product.images[0]?.url
          ? `${product.images[0].url}/public`
          : undefined,
      });
    } else {
      await db.productLike.delete({
        where: { id: { userId, productId } },
      });
    }

    return { success: true };
  } catch (e: any) {
    // 좋아요 중복 요청(레이스)일 경우 멱등 처리
    if (isLike && isUniqueConstraintError(e, ["userId", "productId"])) {
      return { success: true };
    }
    console.error("toggleProductLike Error:", e);
    return { success: false, error: "좋아요 처리 실패" };
  }
}
