/**
 * File Name : features/notification/service/subscription.ts
 * Description : 푸시 구독(PushSubscription) 관리 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.23  임도헌   Created   API Route 로직 이관 (구독/해제/검증)
 */
import "server-only";
import db from "@/lib/db";

type SubscriptionDTO = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
};

/**
 * 푸시 구독 추가/갱신
 * - 기존 전역 설정을 확인하여 Welcome 알림 여부를 결정합니다.
 * - 구독 정보를 저장(Upsert)하고 전역 푸시 설정을 활성화합니다.
 *
 * @param userId - 유저 ID
 * @param dto - 구독 정보 DTO
 * @returns 성공 여부 및 생성된 알림 ID
 */
export async function upsertSubscription(userId: number, dto: SubscriptionDTO) {
  return await db.$transaction(async (tx) => {
    // 1. 기존 전역 설정 확인 (Welcome 알림 로직용)
    const prevPref = await tx.notificationPreferences.findUnique({
      where: { userId },
      select: { pushEnabled: true },
    });
    const shouldSendWelcome = !prevPref || prevPref.pushEnabled === false;

    // 2. 구독 정보 저장 (Upsert)
    await tx.pushSubscription.upsert({
      where: {
        endpoint_userId: {
          endpoint: dto.endpoint,
          userId,
        },
      },
      update: {
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent,
        isActive: true,
        updated_at: new Date(),
      },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent,
        isActive: true,
      },
    });

    // 3. 전역 푸시 설정 ON
    await tx.notificationPreferences.upsert({
      where: { userId },
      update: { pushEnabled: true },
      create: { userId, pushEnabled: true },
    });

    // 4. Welcome 알림 생성 (조건부)
    let welcomeNotiId: number | null = null;
    if (shouldSendWelcome) {
      const noti = await tx.notification.create({
        data: {
          userId,
          title: "푸시 알림 설정 완료",
          body: "푸시 알림이 활성화되었습니다.",
          type: "SYSTEM",
          link: "/profile/notifications",
          isPushSent: false,
        },
        select: { id: true },
      });
      welcomeNotiId = noti.id;
    }

    return { success: true, welcomeNotiId };
  });
}

/**
 * 전역 구독 해제 (Global Unsubscribe)
 * - 전역 설정을 OFF하고 모든 기기의 구독을 비활성화합니다.
 *
 * @param userId - 유저 ID
 */
export async function unsubscribeAll(userId: number) {
  await db.$transaction(async (tx) => {
    // 1. 전역 설정 OFF
    await tx.notificationPreferences.upsert({
      where: { userId },
      update: { pushEnabled: false },
      create: { userId, pushEnabled: false },
    });

    // 2. 모든 기기 비활성화
    await tx.pushSubscription.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  });
}

/**
 * 특정 엔드포인트의 구독 유효성 확인
 * - 전역 설정이 켜져 있고 해당 엔드포인트가 활성 상태인지 검사합니다.
 *
 * @param userId - 유저 ID
 * @param endpoint - 브라우저 엔드포인트 URL
 * @returns 유효성 여부
 */
export async function checkSubscriptionStatus(
  userId: number,
  endpoint: string
) {
  const [pref, sub] = await Promise.all([
    db.notificationPreferences.findUnique({
      where: { userId },
      select: { pushEnabled: true },
    }),
    db.pushSubscription.findFirst({
      where: { userId, endpoint, isActive: true },
      select: { id: true },
    }),
  ]);

  const globalEnabled = pref?.pushEnabled !== false;
  return !!sub && globalEnabled;
}
