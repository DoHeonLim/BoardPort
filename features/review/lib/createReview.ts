/**
 * File Name : features/review/lib/createReview.ts
 * Description : 리뷰 생성(구매자/판매자) + 알림/푸시 + 캐시 무효화
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
 */

"use server";

import "server-only";

import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { isUniqueConstraintError } from "@/lib/errors";
import { badgeChecks } from "@/features/user/lib/badges";
import { sendPushNotification } from "@/features/notification/lib/push-notification";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/lib/policy";

type ReviewType = "buyer" | "seller";

/**
 * createReview 결과 타입
 * - success=true  : 생성된 review 최소 필드 반환(클라이언트 optimistic 업데이트 용도)
 * - success=false : UX 메시지 표준화(권한/상태/중복/기타)
 */
type CreateReviewResult =
  | {
      success: true;
      review: {
        id: number;
        rate: number;
        payload: string;
        userId: number;
        productId: number;
      };
      error?: string;
    }
  | { success: false; error?: string };

/**
 * assert
 * - 서버 액션에서 조건 실패를 즉시 에러로 올려서
 *   최종 catch에서 표준화된 { success:false, error }로 변환한다.
 */
function assert(cond: any, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

/**
 * ProductImage(Cloudflare Images) URL을 UI/푸시에서 사용하는 형태로 정규화.
 * - product 이미지 URL은 `/public` variant를 붙여 노출
 * - 이미 variant가 붙어있는 경우 중복을 방지한다(방어)
 */
function toPublicImage(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.endsWith("/public")) return url;
  return `${url}/public`;
}

/**
 * sendPushAndMarkIfSent
 * - push 전송은 best-effort(푸시 실패가 리뷰 생성 실패로 이어지면 안 됨)
 * - push 정책(pushEnabled/quietHours/타입별 설정)은 호출부의 canSendPushForType에서 처리
 * - 실제 전송 결과 sent>0일 때만 Notification row를 isPushSent/sentAt으로 마킹한다.
 *
 * NOTE:
 * - push 시스템에서 410/Gone 정리 등을 수행해도 이 흐름은 유지된다.
 * - 실패/예외는 로깅만 하고 삼킨다.
 */
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

    // push 결과 모델의 sent 필드는 구현체마다 다를 수 있으므로 방어적으로 접근한다.
    const sent = (result as any)?.sent ?? 0;
    if (result?.success && sent > 0) {
      await db.notification.update({
        where: { id: params.notificationId },
        data: { isPushSent: true, sentAt: new Date() },
      });
    }
  } catch (err) {
    console.warn("[createReview] push failed:", err);
  }
}

/**
 * buildPreview
 * - 알림/푸시 본문에 들어갈 리뷰 내용을 짧게 요약한다.
 * - 공백을 정규화하고 일정 길이를 넘으면 ... 처리한다.
 */
function buildPreview(text: string, max = 30) {
  const plain = text.replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max)}...`;
}

/**
 * createReview
 *
 * 역할:
 * - 구매자/판매자 리뷰 생성(판매완료 상태에서만 가능)
 * - 중복 방지(최종 보장은 DB @@unique([userId, productId]) + P2002)
 * - 알림/푸시(정책 기반, best-effort)
 * - 배지 체크(best-effort)
 * - 캐시 무효화(revalidateTag)
 *
 * type 정의:
 * - type === "buyer"  : 구매자 → 판매자 리뷰
 * - type === "seller" : 판매자 → 구매자 리뷰
 *
 * 중복 방지 전략:
 * - 과거: findFirst로 선조회 후 create
 * - 현재: 선조회 제거 → create에서 P2002를 캐치해 UX 메시지를 통일
 *   (레이스 컨디션에서 선조회는 무력하며, 쿼리 1회 추가로 비용만 증가)
 */
export async function createReview(
  productId: number,
  payload: string,
  rate: number,
  type: ReviewType
): Promise<CreateReviewResult> {
  try {
    // 0) 세션 확인 (서버에서 userId 강제)
    const session = await getSession();
    assert(session?.id, "로그인이 필요합니다.");
    const userId = session.id;

    // 1) 입력 검증
    // - payload: trim 후 2~1000자
    // - rate   : 1~5 정수/실수 허용(정책에 맞게 필요시 정수 강제 가능)
    const text = (payload ?? "").trim();
    assert(
      text.length >= 2 && text.length <= 1000,
      "리뷰는 2~1000자여야 합니다."
    );
    assert(
      Number.isFinite(rate) && rate >= 1 && rate <= 5,
      "별점은 1~5 사이여야 합니다."
    );

    // 2) 제품 컨텍스트 조회
    // - sellerId: product.userId
    // - buyerId : product.purchase_userId (판매완료 상태에서만 존재한다는 전제)
    const prod = await db.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        userId: true, // sellerId
        purchase_userId: true, // buyerId (sold에서만 존재)
        images: { take: 1, select: { url: true } },
      },
    });
    assert(prod, "상품을 찾을 수 없습니다.");

    const sellerId = prod.userId;
    const buyerId = prod.purchase_userId;

    // 3) 작성 자격 검증
    // - 판매완료 상태에서만 리뷰 가능 (buyerId 존재 여부로 판정)
    // - buyer 리뷰: 구매자만 작성 가능
    // - seller 리뷰: 판매자만 작성 가능
    assert(buyerId !== null, "판매완료 상태에서만 리뷰를 작성할 수 있습니다.");

    if (type === "buyer") {
      assert(buyerId === userId, "구매자만 리뷰를 작성할 수 있습니다.");
    } else {
      assert(sellerId === userId, "판매자만 리뷰를 작성할 수 있습니다.");
    }

    // 4) 리뷰 생성 (최종 중복 방지는 DB unique + P2002)
    // - @@unique([userId, productId])로 인해 동시요청/더블클릭 레이스에서도 1개만 생성된다.
    // - P2002를 UX 메시지로 변환하여 "이미 작성" 메시지를 표준화한다.
    let review: any;
    try {
      review = await db.review.create({
        data: { userId, productId, payload: text, rate },
        include: {
          user: { select: { username: true } },
        },
      });
    } catch (e) {
      if (isUniqueConstraintError(e, ["userId", "productId"])) {
        return {
          success: false,
          error: "이미 이 상품에 리뷰를 작성하셨습니다.",
        };
      }
      throw e;
    }

    // 5) 배지 체크(best-effort)
    // - buyer 리뷰면 판매자(sellerId), seller 리뷰면 구매자(buyerId)를 대상으로 체크
    // - 실패해도 리뷰 생성은 유지
    await Promise.allSettled([
      type === "buyer"
        ? badgeChecks.onReviewComplete(sellerId, "buyer")
        : badgeChecks.onReviewComplete(buyerId!, "seller"),
    ]);

    // 6) 알림 대상/링크 결정
    // - buyer 리뷰: 판매자에게 알림, 링크는 my-sales (판매자 관점)
    // - seller 리뷰: 구매자에게 알림, 링크는 my-purchases (구매자 관점)
    const targetUserId = type === "buyer" ? sellerId : buyerId!;
    const link =
      type === "buyer" ? "/profile/my-sales" : "/profile/my-purchases";
    const imageUrl = toPublicImage(prod.images?.[0]?.url);

    // 7) 알림 설정 조회 + 정책 적용
    // - REVIEW 타입 OFF면 Notification row 자체를 생성하지 않는다.
    // - pushEnabled/quietHours/타입별 push ON은 canSendPushForType에서 판정
    const pref = await db.notificationPreferences.findUnique({
      where: { userId: targetUserId },
    });

    if (isNotificationTypeEnabled(pref, "REVIEW")) {
      const title = "새로운 리뷰가 작성되었습니다";
      const body = `${review.user.username}님이 ${prod.title}에 리뷰를 작성했습니다: "${buildPreview(
        text,
        30
      )}"`;

      // 7-1) Notification row 생성(앱 내 알림의 SSOT)
      const notification = await db.notification.create({
        data: {
          userId: targetUserId,
          title,
          body,
          type: "REVIEW",
          link,
          image: imageUrl,
          isPushSent: false, // push가 실제로 나갔을 때만 true로 갱신
        },
      });

      const tasks: Promise<any>[] = [];

      // 7-2) in-app realtime: 유저 전용 채널 브로드캐스트
      // - NotificationListener가 user-{id}-notifications 채널을 구독하고 있어야 한다.
      tasks.push(
        supabase.channel(`user-${targetUserId}-notifications`).send({
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
        })
      );

      // 7-3) push: 정책(quietHours 포함) 통과 시 best-effort로 전송
      if (canSendPushForType(pref, "REVIEW")) {
        tasks.push(
          sendPushAndMarkIfSent({
            notificationId: notification.id,
            targetUserId,
            title: notification.title,
            message: notification.body,
            url: notification.link ?? undefined,
            type: "REVIEW",
            image: notification.image ?? undefined,
            tag: `bp-review-${productId}`, // 기기에서 replace/renotify를 제어할 수 있는 키
            renotify: true,
            topic: `bp-review-${productId}`, // 서버/클라에서 분류용(선택)
          })
        );
      }

      // 알림/푸시는 best-effort: 실패해도 리뷰 성공은 유지
      await Promise.allSettled(tasks);
    }

    // 8) 캐시 무효화(revalidateTag)
    // - 리뷰가 작성된 "대상 유저"의 평균평점/리뷰/배지 캐시 갱신
    // - 제품 상세(product-detail)도 리뷰 표시/카운트 반영 대비로 갱신
    //
    // NOTE:
    // - seller 리뷰도 buyer 프로필 캐시가 갱신되어야 함(평점/리뷰/배지)
    const profileTargetId = type === "buyer" ? sellerId : buyerId!;
    revalidateTag(T.USER_AVERAGE_RATING_ID(profileTargetId));
    revalidateTag(T.USER_REVIEWS_INITIAL_ID(profileTargetId));
    revalidateTag(T.USER_BADGES_ID(profileTargetId));
    revalidateTag(T.PRODUCT_DETAIL_ID(productId));

    // 9) 응답(클라이언트 UX 용 최소 필드)
    return {
      success: true,
      review: {
        id: review.id,
        rate: review.rate,
        payload: review.payload,
        userId: review.userId,
        productId,
      },
    };
  } catch (error) {
    console.error("리뷰 작성 중 오류:", error);

    // assert 에러는 message를 그대로 UX에 전달(표준화된 한국어 메시지)
    const msg =
      error instanceof Error ? error.message : "리뷰 작성에 실패했습니다.";

    return { success: false, error: msg };
  }
}
