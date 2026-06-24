/**
 * File Name : features/notification/service/notification.ts
 * Description : 알림 관련 비즈니스 로직 (조회, 읽음 처리, 발송)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.08  임도헌   Created   알림 목록 조회, 읽음 처리, 관리자 알림 발송 추가
 * 2026.02.12  임도헌   Modified  UNBAN_USER, CHANGE_ROLE 타입 추가 및 알림 생성 로직 보강
 * 2026.03.09  임도헌   Modified  신고 조치용 경고/댓글/리뷰/메시지 삭제 알림 타입 추가
 * 2026.03.12  임도헌   Modified  페이지 파라미터를 총 페이지 수 기준으로 clamp하여 잘못된 페이지 표기 방지
 * 2026.03.12  임도헌   Modified  페이지당 10개 기준과 currentPage 보정 로직 추가
 * 2026.03.16  임도헌   Modified  알림 센터 서버 필터와 전체 필터 개수 집계 응답 추가
 * 2026.04.02  임도헌   Modified  공용 알림 타입과 필터 상수를 types/constants 파일로 분리
 * 2026.04.26  임도헌   Modified  읽음 처리 실패 문구를 알림 센터 UI 액션 라벨과 같은 표현으로 정리
 * 2026.05.16  임도헌   Modified  미읽음 알림 카운트 조회를 service 계층으로 분리
 * 2026.05.24  임도헌   Modified  삭제된 콘텐츠를 가리키는 오래된 알림 링크/이미지 응답 정규화 추가
 * 2026.06.19  임도헌   Modified  관리자 조치 인앱 알림은 명시 링크가 있을 때만 보기 링크를 저장하도록 정리
 */

import "server-only";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { sendPushNotification } from "@/features/notification/service/sender";
import {
  DIRECT_NOTIFICATION_FILTERS,
  NOTIFICATION_PAGE_SIZE,
} from "@/features/notification/constants";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/utils/policy";
import type {
  AdminNotificationType,
  NotificationFilter,
  NotificationListResponse,
} from "@/features/notification/types";
import type { ServiceResult } from "@/lib/types";

type NotificationListRow = NotificationListResponse["items"][number];

function extractIdFromPath(link: string | null, pattern: RegExp) {
  if (!link) return null;
  const match = link.match(pattern);
  if (!match?.[1]) return null;
  const id = Number(match[1]);
  return Number.isInteger(id) ? id : null;
}

function extractChatRoomId(link: string | null) {
  if (!link) return null;
  const match = link.match(/^\/chats\/([^/?#]+)/);
  return match?.[1] ?? null;
}

async function normalizeDeletedContentNotifications(
  items: NotificationListRow[]
): Promise<NotificationListRow[]> {
  if (items.length === 0) return items;

  // hard delete 이후 원본 콘텐츠가 없으면 응답 단계에서 링크/이미지를 제거해 404 이동과 깨진 썸네일을 방지
  const productIds = new Set<number>();
  const postIds = new Set<number>();
  const streamIds = new Set<number>();
  const chatRoomIds = new Set<string>();

  for (const item of items) {
    const productId = extractIdFromPath(item.link, /^\/products\/view\/(\d+)/);
    if (productId) productIds.add(productId);

    const postId = extractIdFromPath(item.link, /^\/posts\/(\d+)/);
    if (postId) postIds.add(postId);

    const streamId = extractIdFromPath(item.link, /^\/streams\/(\d+)/);
    if (streamId) streamIds.add(streamId);

    const chatRoomId = extractChatRoomId(item.link);
    if (chatRoomId) chatRoomIds.add(chatRoomId);
  }

  const [products, posts, streams, chatRooms] = await Promise.all([
    productIds.size
      ? db.product.findMany({
          where: { id: { in: [...productIds] } },
          select: { id: true },
        })
      : Promise.resolve([]),
    postIds.size
      ? db.post.findMany({
          where: { id: { in: [...postIds] } },
          select: { id: true },
        })
      : Promise.resolve([]),
    streamIds.size
      ? db.broadcast.findMany({
          where: { id: { in: [...streamIds] } },
          select: { id: true },
        })
      : Promise.resolve([]),
    chatRoomIds.size
      ? db.productChatRoom.findMany({
          where: { id: { in: [...chatRoomIds] } },
          select: { id: true },
        })
      : Promise.resolve([]),
  ]);

  const existingProductIds = new Set(products.map((item) => item.id));
  const existingPostIds = new Set(posts.map((item) => item.id));
  const existingStreamIds = new Set(streams.map((item) => item.id));
  const existingChatRoomIds = new Set(chatRooms.map((item) => item.id));

  return items.map((item) => {
    const productId = extractIdFromPath(item.link, /^\/products\/view\/(\d+)/);
    if (productId && !existingProductIds.has(productId)) {
      return { ...item, link: null, image: null };
    }

    const postId = extractIdFromPath(item.link, /^\/posts\/(\d+)/);
    if (postId && !existingPostIds.has(postId)) {
      return { ...item, link: null, image: null };
    }

    const streamId = extractIdFromPath(item.link, /^\/streams\/(\d+)/);
    if (streamId && !existingStreamIds.has(streamId)) {
      return { ...item, link: null, image: null };
    }

    const chatRoomId = extractChatRoomId(item.link);
    if (chatRoomId && !existingChatRoomIds.has(chatRoomId)) {
      return { ...item, link: null, image: null };
    }

    return item;
  });
}

/**
 * DB 알림 타입을 알림 센터 필터 그룹으로 정규화
 *
 * [그룹 규칙]
 * - 거래/채팅/후기/뱃지/방송/키워드는 원본 타입 유지
 * - 관리자 조치, 시스템 안내 등 나머지 타입은 시스템 그룹으로 통합
 */
export function mapNotificationTypeToFilter(
  type: string
): Exclude<NotificationFilter, "ALL"> {
  if (
    DIRECT_NOTIFICATION_FILTERS.includes(
      type as (typeof DIRECT_NOTIFICATION_FILTERS)[number]
    )
  ) {
    return type as Exclude<NotificationFilter, "ALL">;
  }
  return "SYSTEM";
}

/**
 * URL 쿼리로 들어오는 알림 필터를 허용된 그룹으로 보정
 *
 * [보정 규칙]
 * - 비어 있거나 알 수 없는 값은 전체로 복귀
 * - 알림 센터에서 허용한 그룹만 유효 필터로 인정
 */
export function normalizeNotificationFilter(
  filter?: string | null
): NotificationFilter {
  if (!filter) return "ALL";
  const upper = filter.toUpperCase();
  if (upper === "ALL") return "ALL";
  if (
    DIRECT_NOTIFICATION_FILTERS.includes(
      upper as (typeof DIRECT_NOTIFICATION_FILTERS)[number]
    )
  ) {
    return upper as NotificationFilter;
  }
  if (upper === "SYSTEM") return "SYSTEM";
  return "ALL";
}

/**
 * 현재 유저의 읽지 않은 알림 개수 조회
 */
export async function getUnreadNotificationCountByUser(userId: number) {
  return db.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

/**
 * 관리자 조치(삭제/정지) 시 대상 유저에게 알림을 발송
 * - DB 저장, 인앱 실시간 브로드캐스트, 웹 푸시를 포함
 */
export async function sendAdminActionNotification({
  targetUserId,
  type,
  title,
  reason,
  link,
}: {
  targetUserId: number;
  type: AdminNotificationType;
  title?: string;
  reason: string;
  link?: string;
}) {
  try {
    let notiTitle = "알림";
    let notiBody = "";

    // 관리자 조치 타입별 카피 구성
    switch (type) {
      case "WARN_USER":
        notiTitle = "운영 정책 경고";
        notiBody = `신고 검토 결과 운영 정책 위반이 확인되었습니다.\n조치 내용: ${reason}`;
        break;
      case "DELETE_PRODUCT":
        notiTitle = "상품이 삭제되었습니다";
        notiBody = `'${title}' 상품이 운영 정책 위반으로 삭제되었습니다.\n사유: ${reason}`;
        break;
      case "DELETE_POST":
        notiTitle = "게시글이 삭제되었습니다";
        notiBody = `'${title}' 게시글이 운영 정책 위반으로 삭제되었습니다.\n사유: ${reason}`;
        break;
      case "DELETE_COMMENT":
        notiTitle = "댓글이 삭제되었습니다";
        notiBody = `작성하신 댓글이 운영 정책 위반으로 삭제되었습니다.\n사유: ${reason}`;
        break;
      case "DELETE_REVIEW":
        notiTitle = "리뷰가 삭제되었습니다";
        notiBody = `작성하신 리뷰가 운영 정책 위반으로 삭제되었습니다.\n사유: ${reason}`;
        break;
      case "DELETE_MESSAGE":
        notiTitle = "메시지가 삭제되었습니다";
        notiBody = `작성하신 메시지가 운영 정책 위반으로 삭제되었습니다.\n사유: ${reason}`;
        break;
      case "DELETE_STREAM":
        notiTitle = "방송이 강제 종료되었습니다";
        notiBody = `'${title}' 방송이 운영 정책 위반으로 종료되었습니다.\n사유: ${reason}`;
        break;
      case "BAN_USER":
        notiTitle = "서비스 이용이 정지되었습니다";
        notiBody = `운영 정책 위반으로 인해 서비스 이용이 제한되었습니다.\n사유: ${reason}`;
        break;
      case "UNBAN_USER":
        notiTitle = "이용 정지가 해제되었습니다";
        notiBody = `이제 보드포트의 모든 서비스를 정상적으로 이용하실 수 있습니다.\n사유: ${reason}`;
        break;
      case "CHANGE_ROLE":
        notiTitle = "계정 권한이 변경되었습니다";
        notiBody = `관리자에 의해 계정 권한이 '${title}'(으)로 변경되었습니다.\n사유: ${reason}`;
        break;
    }

    const pref = await db.notificationPreferences.findUnique({
      where: { userId: targetUserId },
    });

    if (!isNotificationTypeEnabled(pref, "SYSTEM")) return;

    // DB 알림 레코드 생성
    const notification = await db.notification.create({
      data: {
        userId: targetUserId,
        title: notiTitle,
        body: notiBody,
        type: "SYSTEM",
        link: link ?? null,
        isPushSent: false,
      },
    });

    // 실시간 브로드캐스트
    await supabase.channel(`user-${targetUserId}-notifications`).send({
      type: "broadcast",
      event: "notification",
      payload: {
        id: notification.id,
        userId: targetUserId,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        type: notification.type,
        created_at: notification.created_at,
      },
    });

    // 웹 푸시 발송
    if (canSendPushForType(pref, "SYSTEM")) {
      const pushRes = await sendPushNotification({
        targetUserId,
        title: notiTitle,
        message: notiBody,
        url: link ?? "/profile/notifications/list",
        type: "SYSTEM",
      });

      if (pushRes.success && (pushRes.data?.sent ?? 0) > 0) {
        await db.notification.update({
          where: { id: notification.id },
          data: { isPushSent: true, sentAt: new Date() },
        });
      }
    }
  } catch (error) {
    console.error("[sendAdminActionNotification] Error:", error);
  }
}

/**
 * 알림 목록 조회
 * - 사용자가 받은 모든 알림을 최신순으로 조회
 * - page를 1 이상, totalPages 이하 범위로 보정
 * - 선택한 필터 그룹 기준으로 전체 개수와 페이지 결과를 반환
 * - 페이지당 10개 기준 응답 반환
 */
export async function getNotifications(
  userId: number,
  page: number = 1,
  limit: number = NOTIFICATION_PAGE_SIZE,
  filter: NotificationFilter = "ALL"
): Promise<ServiceResult<NotificationListResponse>> {
  try {
    // 페이지/필터 입력 정규화
    const normalizedPage = Number.isFinite(page)
      ? Math.max(1, Math.floor(page))
      : 1;
    const activeFilter = normalizeNotificationFilter(filter);
    const where =
      activeFilter === "ALL"
        ? { userId }
        : activeFilter === "SYSTEM"
          ? {
              userId,
              type: {
                notIn: DIRECT_NOTIFICATION_FILTERS,
              },
            }
          : { userId, type: activeFilter };

    // 필터별 개수 집계
    const groupedCounts = await db.notification.groupBy({
      by: ["type"],
      where: { userId },
      _count: { _all: true },
    });
    const filterCounts = groupedCounts.reduce<
      Record<NotificationFilter, number>
    >(
      (acc, row) => {
        const mappedFilter = mapNotificationTypeToFilter(row.type);
        acc[mappedFilter] += row._count._all;
        acc.ALL += row._count._all;
        return acc;
      },
      {
        ALL: 0,
        TRADE: 0,
        CHAT: 0,
        REVIEW: 0,
        BADGE: 0,
        STREAM: 0,
        KEYWORD: 0,
        SYSTEM: 0,
      }
    );

    // 선택 필터 기준 페이지 계산
    const total = await db.notification.count({ where });
    const totalPages = Math.ceil(total / limit);
    const currentPage =
      totalPages > 0 ? Math.min(normalizedPage, totalPages) : 1;
    const skip = (currentPage - 1) * limit;

    // 현재 페이지 알림 조회
    const items = await db.notification.findMany({
      where,
      select: {
        id: true,
        title: true,
        body: true,
        image: true,
        type: true,
        link: true,
        isRead: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });
    const normalizedItems = await normalizeDeletedContentNotifications(items);

    return {
      success: true,
      data: {
        items: normalizedItems,
        total,
        totalPages,
        currentPage,
        activeFilter,
        filterCounts,
      },
    };
  } catch (error) {
    console.error("[getNotifications] Error:", error);
    return { success: false, error: "알림 목록을 불러오지 못했습니다." };
  }
}

/**
 * 특정 알림을 읽음 처리
 */
export async function markNotificationAsRead(
  notificationId: number,
  userId: number
): Promise<ServiceResult> {
  try {
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true, isRead: true },
    });

    if (!notification)
      return { success: false, error: "알림을 찾을 수 없습니다." };
    if (notification.userId !== userId)
      return { success: false, error: "권한이 없습니다." };
    if (notification.isRead) return { success: true };

    await db.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return { success: true };
  } catch (error) {
    console.error("[markNotificationAsRead] Error:", error);
    return { success: false, error: "알림을 읽음으로 표시하지 못했어요." };
  }
}

/**
 * 모든 알림을 읽음 처리
 */
export async function markAllNotificationsAsRead(
  userId: number
): Promise<ServiceResult> {
  try {
    await db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
  } catch (error) {
    console.error("[markAllNotificationsAsRead] Error:", error);
    return {
      success: false,
      error: "모든 알림을 읽음으로 표시하지 못했어요.",
    };
  }
}
