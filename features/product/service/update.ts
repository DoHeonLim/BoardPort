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
 * 2026.03.12  임도헌   Modified  제품 이미지 교체 시 애니메이션 여부 메타를 함께 재저장
 * 2026.04.02  임도헌   Modified  제품 이미지 public variant 처리 유틸 공용화
 * 2026.04.02  임도헌   Modified  가격 인하 helper JSDoc 보강
 * 2026.04.04  임도헌   Modified  제품 수정 트랜잭션/가격 인하 후처리 단계의 인라인 주석 보강
 * 2026.05.03  임도헌   Modified  상품 수정 시 보드게임 카탈로그 연결 교체 저장 추가
 * 2026.05.03  임도헌   Modified  상품-보드게임 연결 교체 정책 주석 보강
 * 2026.06.18  임도헌   Modified  거래 기준 지역 필수 정책에 맞춰 위치 삭제 저장 경로 제거
 * 2026.08.21  임도헌   Modified  가격 인하 알림·상품 채팅 발신을 서버 전용 private topic으로 전환
 */
import "server-only";

import db from "@/lib/db";
import { realtimeServer as supabase } from "@/features/realtime/service/broadcast";
import {
  notificationRealtimeTopic,
  productChatRealtimeTopic,
} from "@/features/realtime/topics";
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
import { toProductImagePublicUrl } from "@/features/product/utils/image";

/**
 * 가격 인하 대상자에게 인앱/푸시 알림 일괄 전송
 *
 * [동작]
 * - 수신자 알림 설정을 먼저 조회한 뒤 허용된 유저에게만 TRADE 알림 생성
 * - 인앱 broadcast와 푸시를 병렬 처리하고, 실제 푸시 성공 시 Notification 전송 상태 반영
 * - 개별 수신자 실패가 전체 제품 수정 흐름을 막지 않도록 allSettled 기반으로 처리
 *
 * @param params - 가격 인하 상품 정보와 수신자 목록
 * @returns {Promise<void>} 반환값 없음
 */
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

      const tasks: Promise<unknown>[] = [];

      // In-app Broadcast
      tasks.push(
        supabase.channel(notificationRealtimeTopic(userId)).send({
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

      await Promise.all(tasks);
    })
  );
}

/**
 * 활성 상품 채팅방에 가격 인하 시스템 메시지 일괄 전송
 *
 * @param {number} productId - 가격이 인하된 상품 ID
 * @param {number} newPrice - 변경 후 가격
 * @param {number} sellerId - 가격을 변경한 판매자 ID
 * @returns {Promise<void>} 반환값 없음
 */
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

    await supabase.channel(productChatRealtimeTopic(room.id)).send({
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
    // 정지 유저 수정 차단
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

    if (!data.location) {
      return {
        success: false,
        error: "거래 기준 지역을 선택해주세요.",
      };
    }

    // 거래 기준 지역은 상품 노출/거래 문맥의 필수값이므로 항상 현재 선택값으로 갱신
    const locationUpdate = {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      locationName: data.location.locationName,
      region1: data.location.region1,
      region2: data.location.region2,
      region3: data.location.region3,
    };

    // 가격/태그 변경 diff 계산
    const isPriceDropped = data.price < existing.price;
    const oldPrice = existing.price;
    const nextTags = Array.from(new Set(data.tags));
    // 수정 폼의 현재 보드게임 선택값을 전체 교체 기준으로 정규화
    const boardGameIds = Array.from(new Set(data.boardGameIds ?? []));
    const prevTags = existing.search_tags.map((tag) => tag.name);
    const removedTags = prevTags.filter((tag) => !nextTags.includes(tag));
    const addedTags = nextTags.filter((tag) => !prevTags.includes(tag));

    // 2. 트랜잭션 업데이트
    await db.$transaction(async (tx) => {
      // 2-1. 기존 이미지 삭제 (전체 교체 방식)
      await tx.productImage.deleteMany({
        where: { productId },
      });

      // 기존 태그 연결 초기화
      await tx.product.update({
        where: { id: productId },
        data: { search_tags: { set: [] } },
      });
      // 수정 폼의 현재 선택값을 단일 진실로 보고 기존 보드게임 연결 전체 교체
      await tx.productBoardGame.deleteMany({ where: { productId } });

      // 상품 본문 갱신 및 새 태그 재연결
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

      // 교체된 이미지와 애니메이션 메타 재저장
      if (data.photos.length > 0) {
        await tx.productImage.createMany({
          data: data.photos.map((url, index) => ({
            url,
            order: index,
            isAnimated: data.photosAnimated?.[index] ?? false,
            productId,
          })),
        });
      }

      if (boardGameIds.length > 0) {
        // 기존 연결을 비운 뒤 현재 선택값만 재삽입해 수정 폼과 DB 상태 일치
        await tx.productBoardGame.createMany({
          data: boardGameIds.map((boardGameId) => ({
            productId,
            boardGameId,
          })),
          skipDuplicates: true,
        });
      }

      // 제거된 태그 count 감소
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

      // 새로 추가된 태그 count 증가
      if (addedTags.length > 0) {
        await tx.searchTag.updateMany({
          where: { name: { in: addedTags } },
          data: { count: { increment: 1 } },
        });
      }
    });

    // 가격 인하 시 좋아요/채팅 문맥 후처리
    if (isPriceDropped) {
      // 정지 유저를 제외한 찜 유저 조회
      const likedUsers = await db.productLike.findMany({
        where: {
          productId,
          userId: { not: userId }, // 본인 제외
          user: { bannedAt: null }, // 정지 유저 제외
        },
        select: { userId: true },
      });

      // 판매자 기준 차단 관계 제외
      const blockedIds = await getBlockedUserIds(userId);
      const recipientIds = likedUsers
        .map((u) => u.userId)
        .filter((id) => !blockedIds.includes(id));

      // 가격 인하 좋아요 알림의 fire-and-forget 처리
      void notifyPriceDrop({
        productId,
        productTitle: existing.title,
        oldPrice,
        newPrice: data.price,
        image: toProductImagePublicUrl(existing.images[0]?.url),
        recipients: recipientIds,
      });

      // 활성 채팅방 시스템 메시지 fire-and-forget 처리
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
