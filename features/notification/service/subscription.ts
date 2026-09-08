/**
 * File Name : features/notification/service/subscription.ts
 * Description : 푸시 구독(PushSubscription) 관리 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.23  임도헌   Created   API Route 로직 이관 (구독/해제/검증)
 * 2026.03.07  임도헌   Modified  Welcome 알림 링크를 실제 설정 경로로 정정
 * 2026.04.02  임도헌   Modified  푸시 구독 상태 타입을 notification/types 공용 정의로 분리
 * 2026.08.13  임도헌   Modified  endpoint 단일 소유권 이전과 기기 증명 기반 해제/복구 추가
 * 2026.08.13  임도헌   Modified  사용자별 기기 상한·동시성 잠금과 표시 직전 전달 권한 검증 추가
 * 2026.09.01  임도헌   Fixed     PrismaPg가 트랜잭션 잠금의 void 반환값을 역직렬화하지 않도록 정수 열만 반환
 */
import "server-only";
import db from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type {
  PushSubscriptionDTO,
  SubscriptionStatusCheckResult,
} from "@/features/notification/types";

type SubscriptionDTO = PushSubscriptionDTO & {
  userAgent?: string;
};

export const MAX_ACTIVE_PUSH_SUBSCRIPTIONS_PER_USER = 10;

/** endpoint row와 브라우저가 제출한 Web Push 소유 키가 일치하는지 확인한다. */
function hasMatchingDeviceProof(
  subscription: { p256dh: string; auth: string },
  dto: PushSubscriptionDTO
) {
  return (
    subscription.p256dh === dto.keys.p256dh &&
    subscription.auth === dto.keys.auth
  );
}

export class PushSubscriptionOwnershipMismatchError extends Error {
  constructor() {
    super("PUSH_SUBSCRIPTION_OWNERSHIP_MISMATCH");
    this.name = "PushSubscriptionOwnershipMismatchError";
  }
}

export class PushSubscriptionLimitExceededError extends Error {
  constructor() {
    super("PUSH_SUBSCRIPTION_LIMIT_EXCEEDED");
    this.name = "PushSubscriptionLimitExceededError";
  }
}

/**
 * 동일 Push endpoint의 소유권 변경을 transaction advisory lock으로 직렬화한다.
 * PrismaPg의 void 역직렬화 오류를 피하도록 잠금 함수의 결과 대신 정수 열만 조회한다.
 */
async function lockPushEndpoint(
  tx: Prisma.TransactionClient,
  endpoint: string
) {
  await tx.$queryRaw`
    SELECT 1 AS "lockAcquired"
    FROM pg_advisory_xact_lock(hashtext(${`push-subscription:${endpoint}`}))
  `;
}

/**
 * 사용자별 기기 상한 검사를 transaction advisory lock으로 직렬화한다.
 * PrismaPg의 void 역직렬화 오류를 피하도록 잠금 함수의 결과 대신 정수 열만 조회한다.
 */
async function lockPushUser(tx: Prisma.TransactionClient, userId: number) {
  await tx.$queryRaw`
    SELECT 1 AS "lockAcquired"
    FROM pg_advisory_xact_lock(hashtext(${`push-subscription-user:${userId}`}))
  `;
}

/** 현재 endpoint를 제외한 활성 Push 기기 수가 사용자 상한 이내인지 확인한다. */
async function ensureUserHasSubscriptionCapacity(
  tx: Prisma.TransactionClient,
  userId: number,
  currentEndpoint: string
) {
  // 명시적으로 해제됐거나 발송 오류로 비활성화된 stale row는 새 등록 시
  // 정리한다. migration 재검증 대기 row는 다른 정상 기기일 수 있어 보존한다.
  await tx.pushSubscription.deleteMany({
    where: {
      userId,
      isActive: false,
      allows_automatic_reactivation: false,
      endpoint: { not: currentEndpoint },
    },
  });

  const activeOtherDeviceCount = await tx.pushSubscription.count({
    where: {
      userId,
      isActive: true,
      endpoint: { not: currentEndpoint },
    },
  });

  if (activeOtherDeviceCount >= MAX_ACTIVE_PUSH_SUBSCRIPTIONS_PER_USER) {
    throw new PushSubscriptionLimitExceededError();
  }
}

/**
 * 푸시 구독 추가/갱신
 * - 기존 전역 설정 확인
 * - endpoint를 현재 인증 계정으로 원자적 이전/upsert
 * - 전역 푸시 설정 활성화
 *
 * @param userId - 유저 ID
 * @param dto - 구독 정보 DTO
 * @returns 성공 여부 및 생성된 알림 ID
 */
export async function upsertSubscription(userId: number, dto: SubscriptionDTO) {
  return await db.$transaction(async (tx) => {
    // endpoint 단위로 직렬화해 동시 계정 이전/생성이 서로를
    // 덮어쓰는 경쟁을 막는다. DB unique 제약은 최종 방어선이다.
    await lockPushEndpoint(tx, dto.endpoint);
    // 서로 다른 endpoint를 동시에 등록해 기기 상한을 넘는 요청도 직렬화한다.
    await lockPushUser(tx, userId);

    // 기존 전역 설정 확인
    const prevPref = await tx.notificationPreferences.findUnique({
      where: { userId },
      select: { pushEnabled: true },
    });
    const shouldSendWelcome = !prevPref || prevPref.pushEnabled === false;

    const existingSubscription = await tx.pushSubscription.findUnique({
      where: { endpoint: dto.endpoint },
      select: { userId: true, p256dh: true, auth: true },
    });

    // 타 계정 endpoint의 소유권은 현재 브라우저의 키가 기존 row와
    // 정확히 일치할 때만 이전한다. endpoint만 아는 요청은 탈취할 수 없다.
    if (
      existingSubscription &&
      existingSubscription.userId !== userId &&
      !hasMatchingDeviceProof(existingSubscription, dto)
    ) {
      throw new PushSubscriptionOwnershipMismatchError();
    }

    await ensureUserHasSubscriptionCapacity(tx, userId, dto.endpoint);

    // 구독 정보 저장. advisory lock 안에서만 소유권을 이전한다.
    await tx.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      update: {
        userId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent,
        isActive: true,
        requires_ownership_verification: false,
        allows_automatic_reactivation: false,
        updated_at: new Date(),
      },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent,
        isActive: true,
        requires_ownership_verification: false,
        allows_automatic_reactivation: false,
      },
    });

    // 전역 푸시 설정 활성화
    await tx.notificationPreferences.upsert({
      where: { userId },
      update: { pushEnabled: true },
      create: { userId, pushEnabled: true },
    });

    // Welcome 알림 생성
    let welcomeNotiId: number | null = null;
    if (shouldSendWelcome) {
      const noti = await tx.notification.create({
        data: {
          userId,
          title: "푸시 알림 설정 완료",
          body: "푸시 알림이 활성화되었습니다.",
          type: "SYSTEM",
          link: "/profile/notifications/setting",
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
 * 현재 브라우저 기기의 구독만 비활성화한다.
 *
 * - 현재 계정 소유 row는 세션+endpoint로 변경한다.
 * - legacy 타 계정 row도 같은 기기가 보낸 두 키가 일치할 때만 정리한다.
 * - 전역 pushEnabled와 다른 기기는 변경하지 않는다.
 *
 * row 미존재나 타 계정 키 불일치는 멱등적 no-op으로 처리하고,
 * DB 예외만 호출자에게 전파한다.
 */
export async function unsubscribeDevice(
  userId: number | null,
  dto: PushSubscriptionDTO
): Promise<void> {
  await db.$transaction(async (tx) => {
    await lockPushEndpoint(tx, dto.endpoint);

    const subscription = await tx.pushSubscription.findUnique({
      where: { endpoint: dto.endpoint },
      select: { id: true, userId: true, p256dh: true, auth: true },
    });

    // 정리할 row가 없는 것은 멱등적 성공이다.
    if (!subscription) {
      return;
    }

    // 세션으로 현재 계정 row임이 확인되면 endpoint만으로 정리한다.
    // 브라우저 키가 회전됐더라도 본인의 stale row를 남기지 않는다.
    if (userId !== null && subscription.userId === userId) {
      await tx.pushSubscription.updateMany({
        where: {
          id: subscription.id,
          userId,
          endpoint: dto.endpoint,
        },
        data: {
          isActive: false,
          requires_ownership_verification: true,
          allows_automatic_reactivation: false,
        },
      });
      return;
    }

    // 세션이 없거나 타 계정 row인 legacy 경우는 기기가 보유한
    // endpoint+p256dh+auth가 모두 일치할 때만 정리해 타인 DoS를 막는다.
    if (!hasMatchingDeviceProof(subscription, dto)) {
      return;
    }

    await tx.pushSubscription.updateMany({
      where: {
        id: subscription.id,
        userId: subscription.userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
      data: {
        isActive: false,
        requires_ownership_verification: true,
        allows_automatic_reactivation: false,
      },
    });
  });
}

/**
 * 전역 구독 해제 (Global Unsubscribe)
 * - 전역 설정을 OFF하고 모든 기기의 구독을 비활성화
 *
 * @param userId - 유저 ID
 */
export async function unsubscribeAll(userId: number) {
  await db.$transaction(async (tx) => {
    await lockPushUser(tx, userId);

    // 모든 구독을 비활성화하고 migration 재검증 자격도 함께 취소한다.
    // 이미 fail-closed 상태인 legacy row까지 포함해야 이후 전역 설정을
    // 다시 켰을 때 사용자의 이전 OFF 의도가 자동 복구로 뒤집히지 않는다.
    await tx.pushSubscription.updateMany({
      where: { userId },
      data: {
        isActive: false,
        requires_ownership_verification: true,
        allows_automatic_reactivation: false,
      },
    });

    // 구독 row → 환경설정 row 순서로 갱신해 subscribe와 잠금 순서를 맞춘다.
    await tx.notificationPreferences.upsert({
      where: { userId },
      update: { pushEnabled: false },
      create: { userId, pushEnabled: false },
    });
  });
}

/**
 * 특정 엔드포인트의 구독 유효성 확인
 * - 전역 설정이 켜져 있고 해당 엔드포인트가 활성 상태인지 검사
 *
 * @param userId - 유저 ID
 * @param dto - 브라우저 endpoint와 소유 증명 키
 * @returns 유효성 여부
 */
export async function checkSubscriptionStatus(
  userId: number,
  dto: PushSubscriptionDTO
): Promise<SubscriptionStatusCheckResult> {
  return db.$transaction(async (tx) => {
    // subscribe/unsubscribe와 같은 endpoint lock을 사용해 소유권
    // 이전 중 이전 owner row를 복구/비활성화하는 경쟁을 막는다.
    await lockPushEndpoint(tx, dto.endpoint);
    await lockPushUser(tx, userId);

    const subscription = await tx.pushSubscription.findUnique({
      where: { endpoint: dto.endpoint },
      select: {
        id: true,
        userId: true,
        p256dh: true,
        auth: true,
        isActive: true,
        requires_ownership_verification: true,
        allows_automatic_reactivation: true,
      },
    });

    if (!subscription) {
      return { isValid: false, reason: "needs_reconnect" };
    }

    const proofMatches = hasMatchingDeviceProof(subscription, dto);

    // 이전 계정의 legacy row는 브라우저가 소유 키를 증명한 경우에만
    // 즉시 비활성화해 계정 전환 후의 알림 노출을 막는다.
    if (subscription.userId !== userId) {
      if (!proofMatches) {
        return { isValid: false, reason: "needs_reconnect" };
      }

      const deactivated = await tx.pushSubscription.updateMany({
        where: {
          id: subscription.id,
          userId: subscription.userId,
          endpoint: dto.endpoint,
          p256dh: dto.keys.p256dh,
          auth: dto.keys.auth,
        },
        data: {
          isActive: false,
          requires_ownership_verification: true,
          allows_automatic_reactivation: false,
        },
      });

      return deactivated.count === 1
        ? { isValid: false, reason: "account_mismatch" }
        : { isValid: false, reason: "needs_reconnect" };
    }

    const preference = await tx.notificationPreferences.findUnique({
      where: { userId },
      select: { pushEnabled: true },
    });

    const globalEnabled = preference?.pushEnabled !== false;
    if (!globalEnabled) {
      return { isValid: false, reason: "disabled_by_user" };
    }

    if (!proofMatches) {
      return { isValid: false, reason: "needs_reconnect" };
    }

    if (subscription.isActive) {
      return subscription.requires_ownership_verification
        ? { isValid: false, reason: "needs_reconnect" }
        : { isValid: true, reason: "active" };
    }

    // migration 당시 활성 기기가 아니거나 이후 로그아웃/전역 OFF/발송
    // 오류로 비활성화됐다면 일반 앱 진입이 사용자 의도를 덮어쓰지 않는다.
    if (!subscription.allows_automatic_reactivation) {
      return { isValid: false, reason: "needs_reconnect" };
    }

    // migration fail-closed row는 현재 계정+소유 키를 확인한 후
    // 한 번만 복구하고 재검증 표시를 즉시 제거한다.
    const activeOtherDeviceCount = await tx.pushSubscription.count({
      where: {
        userId,
        isActive: true,
        endpoint: { not: dto.endpoint },
      },
    });

    if (activeOtherDeviceCount >= MAX_ACTIVE_PUSH_SUBSCRIPTIONS_PER_USER) {
      return { isValid: false, reason: "needs_reconnect" };
    }

    const reactivated = await tx.pushSubscription.updateMany({
      where: {
        id: subscription.id,
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        isActive: false,
        requires_ownership_verification: true,
        allows_automatic_reactivation: true,
      },
      data: {
        isActive: true,
        requires_ownership_verification: false,
        allows_automatic_reactivation: false,
      },
    });

    if (reactivated.count !== 1) {
      return { isValid: false, reason: "needs_reconnect" };
    }

    return { isValid: true, reason: "active" };
  });
}

/**
 * Service Worker가 Push payload를 표시하기 직전에 현재 인증 계정과
 * endpoint 소유권이 여전히 일치하는지 확인한다.
 *
 * provider에 이미 접수된 알림은 로그아웃 시 회수할 수 없으므로, 세션·전역
 * 설정·활성 구독·기기 키가 모두 일치할 때만 표시를 허용한다.
 */
export async function authorizePushDelivery(
  sessionUserId: number,
  recipientUserId: number,
  dto: PushSubscriptionDTO
): Promise<boolean> {
  if (sessionUserId !== recipientUserId) return false;

  return db.$transaction(async (tx) => {
    await lockPushEndpoint(tx, dto.endpoint);
    await lockPushUser(tx, sessionUserId);

    const [subscription, preference] = await Promise.all([
      tx.pushSubscription.findUnique({
        where: { endpoint: dto.endpoint },
        select: {
          userId: true,
          p256dh: true,
          auth: true,
          isActive: true,
          requires_ownership_verification: true,
        },
      }),
      tx.notificationPreferences.findUnique({
        where: { userId: sessionUserId },
        select: { pushEnabled: true },
      }),
    ]);

    return (
      subscription?.userId === sessionUserId &&
      subscription.isActive &&
      !subscription.requires_ownership_verification &&
      hasMatchingDeviceProof(subscription, dto) &&
      preference?.pushEnabled !== false
    );
  });
}
