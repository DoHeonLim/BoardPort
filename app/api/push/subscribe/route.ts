/**
 * File Name : app/api/push/subscribe/route
 * Description : 푸시 알림 구독 API (전역 ON/OFF는 NotificationPreferences.pushEnabled)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.22  임도헌   Created
 * 2024.12.22  임도헌   Modified  푸시 알림 구독 API 추가
 * 2025.11.29  임도헌   Modified  sendPushNotification 재사용, web-push 직접 호출 제거,
 *                                Notification.sentAt 의미 정리 및 에러 핸들링 보강
 * 2025.12.21  임도헌   Modified  subscribe 시 pushEnabled=true 복구,
 *                                welcome 알림/테스트 푸시는 "처음 켜는 시점"에만 생성,
 *                                DB 동기화는 트랜잭션(return)으로 묶어 타입 안정성 강화
 * 2026.01.04  임도헌   Modified  Prisma Route Handler runtime=nodejs 명시
 */

import { NextResponse } from "next/server";
import getSession from "@/lib/session";
import db from "@/lib/db";
import { sendPushNotification } from "@/features/notification/lib/push-notification";

export const runtime = "nodejs";

// 브라우저 PushSubscription.toJSON() 형태와 맞추기 위한 타입
type RawSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

// welcome 알림(선택 필드) 타입 고정
type WelcomeNotification = {
  id: number;
  title: string;
  body: string;
  link: string | null;
  image: string | null;
};

export async function POST(req: Request) {
  try {
    // 1) 세션 확인 (로그인 필수)
    const session = await getSession();
    const userId = session?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) 요청 바디 파싱 및 기본 검증
    const body = (await req.json()) as RawSubscription;

    if (
      !body ||
      typeof body.endpoint !== "string" ||
      !body.endpoint ||
      !body.keys ||
      typeof body.keys.p256dh !== "string" ||
      typeof body.keys.auth !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid subscription payload" },
        { status: 400 }
      );
    }

    const { endpoint, keys } = body;
    const userAgent = req.headers.get("user-agent") ?? undefined;

    // 3) 구독/설정 동기화 (트랜잭션)
    //    - 전역 ON/OFF 토글은 NotificationPreferences.pushEnabled로 관리
    //    - subscribe 시 pushEnabled=true로 복구
    //    - welcome 알림은 "처음 켜는 시점"(prefs 없음 또는 pushEnabled=false)에서만 생성
    //    - 바깥 변수를 mutate 하지 않고 return으로 가져와 타입 오류(never) 방지
    const welcomeNotification = await db.$transaction(
      async (tx): Promise<WelcomeNotification | null> => {
        const prev = await tx.notificationPreferences.findUnique({
          where: { userId },
          select: { pushEnabled: true },
        });

        const shouldCreateWelcome = !prev || prev.pushEnabled === false;

        // (A) 이 기기/브라우저 endpoint 구독 upsert + 활성화
        await tx.pushSubscription.upsert({
          where: {
            endpoint_userId: {
              endpoint,
              userId,
            },
          },
          update: {
            p256dh: keys.p256dh,
            auth: keys.auth,
            userAgent,
            isActive: true,
          },
          create: {
            userId,
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
            userAgent,
            isActive: true,
          },
        });

        // (B) 전역 푸시 ON으로 복구
        await tx.notificationPreferences.upsert({
          where: { userId },
          update: { pushEnabled: true },
          create: { userId, pushEnabled: true },
        });

        // (C) welcome 알림은 1회만 생성
        if (!shouldCreateWelcome) return null;

        return tx.notification.create({
          data: {
            userId,
            title: "푸시 알림 설정 완료",
            body: "푸시 알림이 활성화되었습니다.",
            type: "SYSTEM",
            link: "/profile/notifications",
            isPushSent: false,
            // sentAt: null (발송 성공 시점에만 갱신)
          },
          select: {
            id: true,
            title: true,
            body: true,
            link: true,
            image: true,
          },
        });
      }
    );

    // 4) 테스트 푸시 알림 발송
    //    - VAPID 미설정/쿼터/네트워크 오류 등으로 실패해도 "구독 자체"는 성공 처리
    if (welcomeNotification) {
      try {
        const result = await sendPushNotification({
          targetUserId: userId,
          title: welcomeNotification.title,
          message: welcomeNotification.body,
          url: welcomeNotification.link ?? undefined,
          type: "SYSTEM",
          image: welcomeNotification.image ?? undefined,
          tag: "welcome",
          renotify: false,
        });

        // 실제 전송건(sent) > 0 인 경우에만 sentAt / isPushSent 갱신
        if (result && result.success && (result as any).sent > 0) {
          await db.notification.update({
            where: { id: welcomeNotification.id },
            data: {
              isPushSent: true,
              sentAt: new Date(),
            },
          });
        }
      } catch (pushError) {
        console.error("[push] test notification failed:", pushError);
      }
    }

    return NextResponse.json(
      { message: "Successfully subscribed to push notifications" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Push subscription error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe to push notifications" },
      { status: 500 }
    );
  }
}
