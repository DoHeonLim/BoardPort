/**
 * File Name : app/api/push/subscribe/route.ts
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
 * 2026.01.23  임도헌   Modified  Service(upsertSubscription) 호출로 변경
 * 2026.03.07  임도헌   Modified  Welcome 푸시 이동 경로를 실제 알림 설정 페이지로 정정
 */
import { NextResponse } from "next/server";
import getSession from "@/lib/session";
import db from "@/lib/db";
import { upsertSubscription } from "@/features/notification/service/subscription";
import { sendPushNotification } from "@/features/notification/service/sender";

export const runtime = "nodejs";

type RawSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

/**
 * POST /api/push/subscribe
 *
 * - 클라이언트로부터 PushSubscription 정보를 받아 DB에 저장(Upsert)
 * - 전역 알림 설정(pushEnabled)을 true로 활성화
 * - 최초 구독 시 Welcome 알림(Push)을 발송
 */
export async function POST(req: Request) {
  try {
    // 1. 세션 확인 (로그인 필수)
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.id;

    // 2. 요청 바디 검증
    const body = (await req.json()) as RawSubscription;
    if (
      !body ||
      !body.endpoint ||
      !body.keys ||
      !body.keys.p256dh ||
      !body.keys.auth
    ) {
      return NextResponse.json(
        { error: "Invalid subscription payload" },
        { status: 400 }
      );
    }

    const { endpoint, keys } = body;
    const userAgent = req.headers.get("user-agent") ?? undefined;

    // 3. Service 호출 (구독 저장 & 설정 활성화)
    // - 기존 구독이 있으면 갱신, 없으면 생성 (Upsert)
    // - 최초 구독이거나 설정이 꺼져있었다면 welcomeNotiId 반환
    const result = await upsertSubscription(userId, {
      endpoint,
      keys,
      userAgent,
    });

    // 4. Welcome 알림 발송 (조건부)
    if (result.welcomeNotiId) {
      try {
        const pushRes = await sendPushNotification({
          targetUserId: userId,
          title: "푸시 알림 설정 완료",
          message: "푸시 알림이 활성화되었습니다.",
          url: "/profile/notifications/setting",
          type: "SYSTEM",
          tag: "welcome",
          renotify: false,
        });

        // 발송 성공 시 DB 업데이트 (통계/상태용)
        if (pushRes?.success && pushRes.data?.sent > 0) {
          await db.notification.update({
            where: { id: result.welcomeNotiId },
            data: { isPushSent: true, sentAt: new Date() },
          });
        }
      } catch (e) {
        console.error("[push] welcome notification failed:", e);
        // Welcome 알림 실패는 전체 프로세스 실패로 간주하지 않음
      }
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Push subscription error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
