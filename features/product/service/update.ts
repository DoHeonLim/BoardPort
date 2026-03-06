/**
 * File Name : features/product/service/update.ts
 * Description : 제품 수정 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.15  임도헌   Created   제품 수정 로직을 actions에서 분리하여 lib로 이동
 * 2025.11.19  임도헌   Modified  제품 상세 및 프로필 판매 탭/카운트 캐시 무효화 추가
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 * 2026.01.20  임도헌   Modified  Controller 분리, 순수 로직화, 타입 적용
 * 2026.01.20  임도헌   Modified  가격 하락 시 찜한 유저 알림 발송 추가
 * 2026.01.22  임도헌   Modified  타입 안전성 보강
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.02.05  임도헌   Modified  가격 하락 알림 대상에서 차단 관계 유저 제외 로직 추가
 * 2026.02.20  임도헌   Modified  가격 하락 시 활성화된 모든 채팅방에 시스템 메시지 발송
 * 2026.02.22  임도헌   Modified  가격 하락 알림 대상에서 정지된 유저(Banned) 완벽 배제
 * 2026.03.07  임도헌   Modified  사용자 노출용 실패 문구를 구체화(v1.2)
 * 2026.03.07  임도헌   Modified  가격 하락 push 성공 판정 기준을 res.data.sent로 정정
 * 2026.03.07  임도헌   Modified  정지 유저 가드와 태그 count 정산 로직 추가
 */
import "server-only";

import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { sendPushNotification } from "@/features/notification/service/sender";
import { getBlockedUserIds } from "@/features/user/service/block";
import { validateUserStatus } from "@/features/user/service/admin";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/utils/policy";
import type { ServiceResult } from "@/lib/types";
import type { ProductDTO } from "@/features/product/types";
import { mapToChatMessage } from "@/features/chat/utils/converter";

// 알림 발송 헬퍼 (비동기 Fire-and-Forget용)
async function notifyPriceDrop(params: {
  productId: number;
  productTitle: string;
  oldPrice: number;
  newPrice: number;
  image?: string;
  recipients: number[];
}) {
  const { productId, productTitle, oldPrice, newPrice, image, recipients } =
    params;

  if (recipients.length === 0) return;

  // 1. 수신자들의 알림 설정 조회
  const prefs = await db.notificationPreferences.findMany({
    where: { userId: { in: recipients } },
  });
  const prefMap = new Map(prefs.map((p) => [p.userId, p]));

  const title = "찜한 상품 가격 인하! 📉";
  const body = `'${productTitle}' 가격이 ${oldPrice.toLocaleString()}원 → ${newPrice.toLocaleString()}원으로 내려갔어요.`;
  const link = `/products/view/${productId}`;

  // 2. 각 수신자에게 알림 전송 (병렬 처리)
  await Promise.allSettled(
    recipients.map(async (userId) => {
      const pref = prefMap.get(userId);
      // TRADE 타입 알림으로 처리 (알림 설정 확인)
      if (pref && !isNotificationTypeEnabled(pref, "TRADE")) return;

      // DB 알림 생성
      const notification = await db.notification.create({
        data: {
          userId,
          title,
          body,
          type: "TRADE",
          link,
          image,
          isPushSent: false,
        },
      });

      const tasks: Promise<any>[] = [];

      // In-app Broadcast
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
            image: notification.image,
            created_at: notification.created_at,
          },
        })
      );

      // Push Notification
      if (canSendPushForType(pref, "TRADE")) {
        tasks.push(
          sendPushNotification({
            targetUserId: userId,
            title,
            message: body,
            url: link,
            type: "TRADE",
            image,
            tag: `price-drop-${productId}`, // 중복 알림 방지 태그
            renotify: true,
          }).then(async (res: any) => {
            if (res?.success && (res.data?.sent ?? 0) > 0) {
              await db.notification.update({
                where: { id: notification.id },
                data: { isPushSent: true, sentAt: new Date() },
              });
            }
          })
        );
      }

      await Promise.all(tasks);
    })
  );
}

async function notifyPriceDropInChats(
  productId: number,
  newPrice: number,
  sellerId: number
) {
  const rooms = await db.productChatRoom.findMany({
    where: { productId },
    select: { id: true },
  });

  for (const room of rooms) {
    const sysMsg = await db.productMessage.create({
      data: {
        type: "SYSTEM",
        userId: sellerId, // 판매자 ID
        productChatRoomId: room.id,
        payload: `상품 가격이 ${newPrice.toLocaleString()}원으로 인하되었습니다.`,
      },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    });

    await supabase.channel(`room-${room.id}`).send({
      type: "broadcast",
      event: "message",
      payload: mapToChatMessage(sysMsg),
    });
  }
}

/**
 * 제품 정보를 수정
 * - 소유권을 확인하고 기존 이미지/태그를 정리한 뒤 업데이트
 * - 가격 하락 시 찜한 유저에게 알림을 발송
 *
 * @param {number} userId - 요청자(소유자) ID
 * @param {number} productId - 수정할 제품 ID
 * @param {ProductDTO} data - 수정할 데이터 DTO
 * @returns {Promise<ServiceResult<{ productId: number }>>} 수정 성공 시 제품 ID 반환
 */
export async function updateProduct(
  userId: number,
  productId: number,
  data: ProductDTO
): Promise<ServiceResult<{ productId: number }>> {
  try {
    const status = await validateUserStatus(userId);
    if (!status.success) return status;

    // 1. 소유권 및 기존 데이터 확인 (가격 비교용)
    const existing = await db.product.findUnique({
      where: { id: productId },
      select: {
        userId: true,
        price: true,
        title: true,
        images: { take: 1, orderBy: { order: "asc" }, select: { url: true } },
        search_tags: { select: { name: true } },
      },
    });

    if (!existing) {
      return { success: false, error: "제품을 찾을 수 없습니다." };
    }
    if (existing.userId !== userId) {
      return { success: false, error: "수정 권한이 없습니다." };
    }

    // 위치 정보 업데이트 데이터 구성
    // data.location이 null이면 DB 필드도 null로 초기화(위치 삭제)해야 함
    const locationUpdate = data.location
      ? {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          locationName: data.location.locationName,
          region1: data.location.region1,
          region2: data.location.region2,
          region3: data.location.region3,
        }
      : {
          latitude: null,
          longitude: null,
          locationName: null,
          region1: null,
          region2: null,
          region3: null,
        };

    // 가격 하락 여부 체크
    const isPriceDropped = data.price < existing.price;
    const oldPrice = existing.price;
    const nextTags = Array.from(new Set(data.tags));
    const prevTags = existing.search_tags.map((tag) => tag.name);
    const removedTags = prevTags.filter((tag) => !nextTags.includes(tag));
    const addedTags = nextTags.filter((tag) => !prevTags.includes(tag));

    // 2. 트랜잭션 업데이트
    await db.$transaction(async (tx) => {
      // 2-1. 기존 이미지 삭제 (전체 교체 방식)
      await tx.productImage.deleteMany({
        where: { productId },
      });

      // 2-2. 기존 태그 연결 해제 (새로 덮어쓰기 위해)
      await tx.product.update({
        where: { id: productId },
        data: { search_tags: { set: [] } },
      });

      // 2-3. 제품 정보 업데이트 및 태그 재연결
      await tx.product.update({
        where: { id: productId },
        data: {
          title: data.title,
          description: data.description,
          price: data.price,
          game_type: data.game_type,
          min_players: data.min_players,
          max_players: data.max_players,
          play_time: data.play_time,
          condition: data.condition,
          completeness: data.completeness,
          has_manual: data.has_manual,
          ...locationUpdate,
          category: { connect: { id: data.categoryId } },
          search_tags: {
            connectOrCreate: nextTags.map((tag) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          },
        },
      });

      // 2-4. 새 이미지 추가
      if (data.photos.length > 0) {
        await tx.productImage.createMany({
          data: data.photos.map((url, index) => ({
            url,
            order: index,
            productId,
          })),
        });
      }

      if (removedTags.length > 0) {
        await Promise.all(
          removedTags.map((tag) =>
            tx.searchTag.updateMany({
              where: { name: tag, count: { gt: 0 } },
              data: { count: { decrement: 1 } },
            })
          )
        );
      }

      if (addedTags.length > 0) {
        await tx.searchTag.updateMany({
          where: { name: { in: addedTags } },
          data: { count: { increment: 1 } },
        });
      }
    });

    // 3. 가격 하락 알림 발송 (비동기)
    if (isPriceDropped) {
      // 찜한 유저 ID 목록 조회
      const likedUsers = await db.productLike.findMany({
        where: {
          productId,
          userId: { not: userId }, // 본인 제외
          user: { bannedAt: null }, // 정지 유저 제외
        },
        select: { userId: true },
      });

      const blockedIds = await getBlockedUserIds(userId); // 판매자 기준 차단 목록
      const recipientIds = likedUsers
        .map((u) => u.userId)
        .filter((id) => !blockedIds.includes(id)); // 차단된 유저 제외

      // 1. 전역 푸시
      // Fire-and-forget: 알림 발송을 기다리지 않고 바로 응답 반환
      void notifyPriceDrop({
        productId,
        productTitle: existing.title,
        oldPrice,
        newPrice: data.price,
        image: existing.images[0]?.url
          ? `${existing.images[0].url}/public`
          : undefined,
        recipients: recipientIds,
      });
      // 2. 진행 중인 모든 채팅방에 시스템 메시지 전송
      void notifyPriceDropInChats(productId, data.price, userId);
    }

    return {
      success: true,
      data: { productId },
    };
  } catch (err) {
    console.error("updateProduct Service Error:", err);
    return {
      success: false,
      error:
        "제품 수정에 실패했습니다. 변경한 항목과 이미지 상태를 확인한 뒤 다시 시도해주세요.",
    };
  }
}
