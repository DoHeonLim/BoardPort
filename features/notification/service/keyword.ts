/**
 * File Name : features/notification/service/keyword.ts
 * Description : 키워드 알림 매칭 및 발송 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.12  임도헌   Created   상품 등록 시 키워드 매칭 로직 구현
 * 2026.02.12  임도헌   Modified  키워드 추가/삭제/조회 기능 추가 및 최대 개수 제한(10개) 적용
 * 2026.02.13  임도헌   Modified  빈 키워드 매칭 방지 및 본인 제외 로직 재확인
 * 2026.02.21  임도헌   Modified  키워드별 개별 지역 범위(regionRange) 정책 적용
 * 2026.02.22  임도헌   Modified  JSDoc 최신화 (URL Legacy 제거 및 DB SSOT 동기화) 및 Upsert 로직 개선
 * 2026.03.07  임도헌   Modified  키워드 알림 실패 문구를 구체화(v1.2)
 * 2026.03.07  임도헌   Modified  push 성공 판정 기준을 res.data.sent로 정정
 */

import "server-only";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { MAX_KEYWORD_PER_USER } from "@/lib/constants";
import { sendPushNotification } from "@/features/notification/service/sender";
import { getBlockedUserIds } from "@/features/user/service/block";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/utils/policy";
import { isWithinRegionRange } from "@/features/user/utils/region";
import type { ServiceResult } from "@/lib/types";
import type { RegionRange } from "@/generated/prisma/enums";

/**
 * 등록된 상품 정보를 바탕으로 알림 키워드를 매칭하고 알림을 발송
 *
 * 1. 판매자와 차단 관계(양방향)인 유저 ID 목록을 조회하여 매칭 대상에서 제외
 * 2. 상품의 제목과 태그 내에 키워드가 포함되는지 검사
 * 3. 유저의 전역 설정이 아닌, '해당 키워드에 설정된 고유 범위(alert.regionRange)'를
 *    기준으로 상품 지역과 일치하는지 평가 (isWithinRegionRange 사용)
 * 4. 매칭된 유저에게 In-App 및 Push 알림을 병렬 발송
 *
 * @param productId - 상품 ID
 * @param title - 상품 제목
 * @param tags - 상품 태그 배열
 * @param sellerId - 판매자 ID (본인 및 차단 유저 제외용)
 * @param region1 - 상품 시/도
 * @param region2 - 상품 구/군
 * @param region3 - 상품 동/읍/면
 */
export async function checkAndSendKeywordAlert({
  productId,
  title,
  tags,
  sellerId,
  region1,
  region2,
  region3,
}: {
  productId: number;
  title: string;
  tags: string[];
  sellerId: number;
  region1?: string | null;
  region2?: string | null;
  region3?: string | null;
}) {
  // 1. 매칭 대상 텍스트 준비
  const targetText = `${title} ${tags.join(" ")}`.toLowerCase();

  // 판매자와 차단 관계(양방향)인 유저 ID 목록
  const blockedIds = await getBlockedUserIds(sellerId);

  // 2. 전체 키워드 로드
  const allAlerts = await db.keywordAlert.findMany({
    where: {
      userId: { notIn: [sellerId, ...blockedIds] },
      user: { bannedAt: null }, // 정지 유저에게 푸시 낭비 방지
    },
    select: {
      userId: true,
      keyword: true,
      regionRange: true,
      user: {
        select: {
          notification_preferences: true,
          region1: true,
          region2: true,
          region3: true,
          regionRange: true,
        },
      },
    },
  });

  const recipients = new Map<number, string[]>();

  for (const alert of allAlerts) {
    const keyword = alert.keyword.trim().toLowerCase();

    // 빈 키워드 무시 (데이터 무결성 방어)
    if (!keyword) continue;

    // 단순 포함 여부 검사
    if (targetText.includes(keyword)) {
      // 매칭 검사 시 유저의 전역 범위가 아닌 "키워드의 범위"를 주입
      const isLocalMatch = isWithinRegionRange(
        {
          region1: alert.user.region1,
          region2: alert.user.region2,
          region3: alert.user.region3,
          regionRange: alert.regionRange, // 키워드 고유 범위
        },
        { region1, region2, region3 }
      );

      if (isLocalMatch) {
        const keywords = recipients.get(alert.userId) || [];
        keywords.push(alert.keyword);
        recipients.set(alert.userId, keywords);
      }
    }
  }

  if (recipients.size === 0) return;

  const now = new Date();
  const tasks: Promise<any>[] = [];

  // 4. 알림 발송 (병렬 처리)
  for (const [userId, keywords] of recipients.entries()) {
    // 해당 유저의 설정 정보 찾기
    const alertInfo = allAlerts.find((a) => a.userId === userId);
    const prefs = alertInfo?.user.notification_preferences;

    // KEYWORD 알림 켜져 있는지 확인
    if (!isNotificationTypeEnabled(prefs, "KEYWORD")) continue;

    // 알림 메시지 구성
    const keywordStr = keywords.slice(0, 2).join(", ");
    const extra = keywords.length > 2 ? ` 외 ${keywords.length - 2}개` : "";
    const notiTitle = `키워드 '${keywordStr}${extra}' 알림 🔔`;
    const notiBody = `"${title}" 상품이 등록되었습니다.`;
    const link = `/products/view/${productId}`;

    // DB 알림 생성
    const notification = await db.notification.create({
      data: {
        userId,
        title: notiTitle,
        body: notiBody,
        type: "KEYWORD",
        link,
        isPushSent: false,
      },
    });

    // In-App Broadcast
    tasks.push(
      supabase.channel(`user-${userId}-notifications`).send({
        type: "broadcast",
        event: "notification",
        payload: {
          id: notification.id,
          userId,
          title: notification.title,
          body: notification.body,
          link: notification.link,
          type: notification.type,
          created_at: notification.created_at,
        },
      })
    );

    // Push Notification
    if (canSendPushForType(prefs, "KEYWORD", now)) {
      tasks.push(
        sendPushNotification({
          targetUserId: userId,
          title: notification.title,
          message: notification.body,
          url: link,
          type: "KEYWORD",
          tag: `bp-keyword-${productId}`,
        }).then(async (res) => {
          if (res?.success && (res.data?.sent ?? 0) > 0) {
            await db.notification.update({
              where: { id: notification.id },
              data: { isPushSent: true, sentAt: new Date() },
            });
          }
        })
      );
    }
  }

  await Promise.allSettled(tasks);
}

/**
 * 키워드 알림 등록 (Upsert)
 *
 * - 최대 10개까지 등록 가능
 * - 이미 등록된 키워드라면 에러를 뱉지 않고, 새로 지정한 지역 범위(RegionRange)로 업데이트함
 *
 * @param userId - 유저 ID
 * @param keyword - 등록할 키워드
 * @param regionRange - 키워드 매칭에 사용할 지역 범위 (DONG, GU, CITY, ALL)
 * @returns {Promise<ServiceResult>} 등록 결과
 */
export async function addKeywordAlert(
  userId: number,
  keyword: string,
  regionRange: RegionRange
): Promise<ServiceResult> {
  try {
    const trimmed = keyword.trim().toLowerCase();
    if (!trimmed || trimmed.length < 2) {
      return { success: false, error: "키워드는 최소 2자 이상이어야 합니다." };
    }

    // 1. 개수 제한 확인 (신규 등록일 경우에만 제한에 걸리도록 체크)
    const existing = await db.keywordAlert.findUnique({
      where: { userId_keyword: { userId, keyword: trimmed } },
    });

    if (!existing) {
      const count = await db.keywordAlert.count({ where: { userId } });
      if (count >= MAX_KEYWORD_PER_USER) {
        return {
          success: false,
          error: `최대 ${MAX_KEYWORD_PER_USER}개까지만 등록 가능합니다.`,
        };
      }
    }

    // 2. 등록 또는 업데이트 (Upsert)
    await db.keywordAlert.upsert({
      where: {
        userId_keyword: { userId, keyword: trimmed },
      },
      update: {
        regionRange, // 이미 있으면 범위만 업데이트
      },
      create: {
        userId,
        keyword: trimmed,
        regionRange,
      },
    });

    return { success: true };
  } catch (e) {
    console.error("addKeywordAlert error:", e);
    return {
      success: false,
      error:
        "키워드 등록에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

/**
 * 키워드 알림 해제 (삭제)
 */
export async function removeKeywordAlert(
  userId: number,
  alertId: number
): Promise<ServiceResult> {
  try {
    await db.keywordAlert.delete({
      where: { id: alertId, userId },
    });
    return { success: true };
  } catch {
    return {
      success: false,
      error:
        "키워드 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

/**
 * 내 키워드 알림 목록 조회
 */
export async function getMyKeywordAlerts(userId: number) {
  return await db.keywordAlert.findMany({
    where: { userId },
    orderBy: { created_at: "desc" },
    select: { id: true, keyword: true, regionRange: true },
  });
}
