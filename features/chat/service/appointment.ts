/**
 * File Name : features/chat/service/appointment.ts
 * Description : 약속(Appointment) 관련 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.16  임도헌   Created   약속 제안/수락/거절 로직 구현
 * 2026.02.20  임도헌   Modified  취소 로직에 PENDING 상태 가드 추가 및 JSDoc 개선
 * 2026.02.20  임도헌   Modified  새로운 약속을 만들 때 기존의 대기 중인 약속을 정리하도록 수정
 * 2026.02.22  임도헌   Modified  약속 수락 트랜잭션 통합(원자성 보장) 및 알림 발송 로직 독립 구현
 * 2026.02.23  임도헌   Modified  보안 가드(과거 시간, IDOR, Ghost User) 및 동시성 제어 강화
 */

import "server-only";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { validateUserStatus } from "@/features/user/service/admin";
import { checkBlockRelation } from "@/features/user/service/block";
import { mapToChatMessage } from "@/features/chat/utils/converter";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/utils/policy";
import { sendPushNotification } from "@/features/notification/service/sender";
import type { ServiceResult } from "@/lib/types";
import type { ChatMessage } from "@/features/chat/types";
import type { LocationData } from "@/features/map/types";

/**
 * 약속 제안하기
 *
 * 1. 유저 상태(Ban), 날짜 유효성(과거 시간), 채팅방 참여 권한(IDOR), 상품 거래 가능 여부 검증
 * 2. 상대방 존재 여부 및 차단 관계 확인
 * 3. 트랜잭션 실행:
 *    - 상품 상태 Double Check (Race Condition 방지)
 *    - 해당 채팅방의 기존 PENDING 약속을 일괄 취소 (단일 제안 유지 정책)
 *    - 새 약속 및 제안 메시지 생성
 * 4. 실시간 브로드캐스트 (기존 약속 취소 알림 + 새 제안 메시지)
 *
 * @param userId - 제안자 ID
 * @param chatRoomId - 채팅방 ID
 * @param data - { meetDate: 약속 일시, location: 장소 정보 }
 * @returns {Promise<ServiceResult>} - 약속 정보
 */
export async function proposeAppointment(
  userId: number,
  chatRoomId: string,
  data: { meetDate: Date; location: LocationData }
): Promise<ServiceResult<ChatMessage>> {
  // 1. 유저 상태 검증 (정지된 유저 차단)
  const status = await validateUserStatus(userId);
  if (!status.success) return status;

  // 2. 날짜 유효성 및 과거 시간 검증
  const meetTime = new Date(data.meetDate).getTime();
  if (isNaN(meetTime)) {
    return { success: false, error: "유효하지 않은 날짜 형식입니다." };
  }

  // 네트워크 지연 등을 고려하여 5분의 유예 시간(Grace Period) 부여
  const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
  if (meetTime < fiveMinsAgo) {
    return {
      success: false,
      error: "과거 시간으로는 약속을 제안할 수 없습니다.",
    };
  }

  // 3. 채팅방 및 상품 상태 조회
  const room = await db.productChatRoom.findUnique({
    where: { id: chatRoomId },
    include: {
      users: { select: { id: true } },
      product: {
        select: { id: true, purchase_userId: true, reservation_userId: true },
      },
    },
  });

  if (!room) return { success: false, error: "채팅방을 찾을 수 없습니다." };

  // IDOR 방어: 요청자가 실제 채팅방 참여자인지 검증
  const isMember = room.users.some((u) => u.id === userId);
  if (!isMember) {
    return { success: false, error: "해당 채팅방에 접근할 권한이 없습니다." };
  }

  // 상품이 이미 거래 중(예약/판매완료)인지 확인 (Fail-Early)
  if (room.product.purchase_userId || room.product.reservation_userId) {
    return { success: false, error: "이미 거래가 진행 중인 상품입니다." };
  }

  // 수신자 식별 및 차단 관계 확인
  const receiver = room.users.find((u) => u.id !== userId);
  if (!receiver) {
    return { success: false, error: "대화 상대를 찾을 수 없습니다." };
  }

  const isBlocked = await checkBlockRelation(userId, receiver.id);
  if (isBlocked) {
    return {
      success: false,
      error: "차단된 상대와는 약속을 잡을 수 없습니다.",
    };
  }

  try {
    // 취소될 기존 약속들 식별 (클라이언트 상태 동기화용)
    const pendingApts = await db.appointment.findMany({
      where: { chatRoomId, status: "PENDING" },
      select: { id: true },
    });

    // 4. 트랜잭션 실행
    const result = await db.$transaction(async (tx) => {
      // 트랜잭션 내부에서 상품 상태 재확인 (Race Condition 방어)
      const currentProduct = await tx.product.findUnique({
        where: { id: room.product.id },
        select: { purchase_userId: true, reservation_userId: true },
      });

      if (
        currentProduct?.purchase_userId ||
        currentProduct?.reservation_userId
      ) {
        throw new Error("PRODUCT_ALREADY_TRADED");
      }

      // 기존 PENDING 약속 일괄 취소
      await tx.appointment.updateMany({
        where: { chatRoomId, status: "PENDING" },
        data: { status: "CANCELED" },
      });

      // 새 약속 생성
      const appointment = await tx.appointment.create({
        data: {
          meetDate: data.meetDate,
          location: data.location.locationName,
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          chatRoomId,
          proposerId: userId,
          receiverId: receiver.id,
          status: "PENDING",
        },
      });

      // 약속 제안 메시지 생성
      const message = await tx.productMessage.create({
        data: {
          type: "APPOINTMENT",
          userId,
          productChatRoomId: chatRoomId,
          appointmentId: appointment.id,
          payload: "약속을 제안했습니다.",
        },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          appointment: true,
        },
      });

      // 채팅방 최신화 (목록 상단 이동)
      await tx.productChatRoom.update({
        where: { id: chatRoomId },
        data: { updated_at: new Date() },
      });

      return message;
    });

    // 5. 실시간 브로드캐스트
    // - 취소된 약속들에 대한 상태 업데이트 전송
    for (const oldApt of pendingApts) {
      await supabase.channel(`room-${chatRoomId}`).send({
        type: "broadcast",
        event: "appointment_update",
        payload: { id: oldApt.id, status: "CANCELED" },
      });
    }

    // - 새 약속 제안 메시지 전송
    const chatMessage = mapToChatMessage(result);
    await supabase.channel(`room-${chatRoomId}`).send({
      type: "broadcast",
      event: "message",
      payload: chatMessage,
    });

    return { success: true, data: chatMessage };
  } catch (error: any) {
    if (error.message === "PRODUCT_ALREADY_TRADED") {
      return { success: false, error: "이미 거래가 진행 중인 상품입니다." };
    }
    console.error("proposeAppointment error:", error);
    return { success: false, error: "약속 제안 중 오류가 발생했습니다." };
  }
}

/**
 * 약속 수락 처리
 *
 * [Logic Flow]
 * 1. 약속 존재/권한 확인 및 시간 만료 검증
 * 2. Ghost User 방어: 제안자뿐만 아니라 '수락자 본인'도 현재 채팅방에 참여 중인지 DB 기준으로 재확인하여 API Replay 공격을 차단
 * 3. 상품 거래 상태(중복 예약/판매 방지) 및 비정상 거래 대상(본인 거래) 검증
 * 4. 통합 트랜잭션 (Atomic Operation):
 *    - updateMany를 사용해 약속 상태를 ACCEPTED로 변경 (동시성 제어/멱등성 확보)
 *    - 상품 상태를 RESERVED로 변경하고 예약자 정보를 업데이트
 *    - 해당 상품의 다른 채팅방에 존재하는 PENDING 약속을 일괄 CANCELED 처리
 *    - 시스템 메시지 생성 및 채팅방 최신화
 * 5. 알림 스마트 라우팅: 수락 행위자를 제외한 상대방에게만 In-App/Push 알림 전송
 *
 * @param userId - 수락 요청자 ID
 * @param appointmentId - 약속 ID
 * @returns 변경된 상품 및 거래자 정보 (캐시 무효화용)
 */
export async function acceptAppointment(
  userId: number,
  appointmentId: number
): Promise<
  ServiceResult<{ productId: number; sellerId: number; buyerId: number }>
> {
  // 1. 약속 및 채팅방 정보 조회
  const apt = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      chatRoom: {
        include: { users: { select: { id: true } } },
      },
    },
  });

  if (!apt) return { success: false, error: "약속 정보를 찾을 수 없습니다." };
  if (apt.receiverId !== userId)
    return { success: false, error: "수락 권한이 없습니다." };
  if (apt.status !== "PENDING")
    return { success: false, error: "이미 처리된 약속입니다." };

  // 2. Ghost User & 차단 가드
  const isProposerInRoom = apt.chatRoom.users.some(
    (u) => u.id === apt.proposerId
  );
  const isReceiverInRoom = apt.chatRoom.users.some((u) => u.id === userId);

  if (!isProposerInRoom || !isReceiverInRoom) {
    return {
      success: false,
      error: "대화 참여자 중 일부가 채팅방을 나가 약속을 진행할 수 없습니다.",
    };
  }

  const isBlocked = await checkBlockRelation(userId, apt.proposerId);
  if (isBlocked) {
    return {
      success: false,
      error: "차단된 사용자와는 약속을 진행할 수 없습니다.",
    };
  }

  if (new Date(apt.meetDate) < new Date()) {
    return { success: false, error: "약속 시간이 이미 지났습니다." };
  }

  // 3. 상품 정보 조회 (판매자 식별용)
  const product = await db.product.findUnique({
    where: { id: apt.chatRoom.productId },
    select: {
      id: true,
      userId: true,
      title: true,
      images: { take: 1, select: { url: true } },
    },
  });

  if (!product)
    return { success: false, error: "상품 정보를 찾을 수 없습니다." };

  const sellerId = product.userId;
  const buyerId = apt.proposerId === sellerId ? apt.receiverId : apt.proposerId;

  // 본인 거래 방지
  if (buyerId === sellerId) {
    return {
      success: false,
      error: "비정상적인 거래 대상입니다.",
    };
  }

  try {
    // 4. 통합 트랜잭션 (Atomic Operation)
    const { sysMsg, canceledApts } = await db.$transaction(async (tx) => {
      // (1) 약속 상태 변경 (PENDING -> ACCEPTED)
      // 이미 처리되었다면 count가 0이 됨
      const aptUpdated = await tx.appointment.updateMany({
        where: { id: appointmentId, status: "PENDING" },
        data: { status: "ACCEPTED" },
      });

      if (aptUpdated.count === 0) throw new Error("ALREADY_PROCESSED_APT");

      // (2) 상품 상태 변경 (판매중 -> 예약중)
      // * 핵심: reservation_userId가 null일 때만 업데이트 (동시성 방어)
      const prodUpdated = await tx.product.updateMany({
        where: {
          id: apt.chatRoom.productId,
          purchase_userId: null,
          reservation_userId: null,
        },
        data: {
          reservation_at: new Date(),
          reservation_userId: buyerId,
        },
      });

      if (prodUpdated.count === 0) throw new Error("PRODUCT_ALREADY_TRADED");

      // (3) 해당 상품의 다른 PENDING 약속 일괄 취소
      const otherApts = await tx.appointment.findMany({
        where: {
          chatRoom: { productId: apt.chatRoom.productId },
          status: "PENDING",
        },
        select: { id: true, chatRoomId: true },
      });

      if (otherApts.length > 0) {
        await tx.appointment.updateMany({
          where: { id: { in: otherApts.map((a) => a.id) } },
          data: { status: "CANCELED" },
        });
      }

      // (4) 시스템 메시지 생성
      const msg = await tx.productMessage.create({
        data: {
          type: "SYSTEM",
          userId,
          productChatRoomId: apt.chatRoomId,
          payload: "약속이 확정되었습니다. 상품이 '예약중'으로 변경됩니다.",
        },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
        },
      });

      // (5) 채팅방 최신화
      await tx.productChatRoom.update({
        where: { id: apt.chatRoomId },
        data: { updated_at: new Date() },
      });

      return { sysMsg: msg, canceledApts: otherApts };
    });

    // 5. 실시간 이벤트 전송 (Fire & Forget)
    void supabase.channel(`room-${apt.chatRoomId}`).send({
      type: "broadcast",
      event: "message",
      payload: mapToChatMessage(sysMsg),
    });
    void supabase.channel(`room-${apt.chatRoomId}`).send({
      type: "broadcast",
      event: "appointment_update",
      payload: { id: appointmentId, status: "ACCEPTED" },
    });

    for (const canceled of canceledApts) {
      void supabase.channel(`room-${canceled.chatRoomId}`).send({
        type: "broadcast",
        event: "appointment_update",
        payload: { id: canceled.id, status: "CANCELED" },
      });
    }

    // 6. 알림 전송 (상대방에게)
    const targetNotiId = userId === buyerId ? sellerId : buyerId;
    const pref = await db.notificationPreferences.findUnique({
      where: { userId: targetNotiId },
    });

    if (!pref || isNotificationTypeEnabled(pref, "TRADE")) {
      const productTitle = product.title;
      const imageUrl = product.images?.[0]?.url
        ? `${product.images[0].url}/public`
        : undefined;

      const notification = await db.notification.create({
        data: {
          userId: targetNotiId,
          title: "상품이 예약되었습니다",
          body: `'${productTitle}' 상품의 거래 약속이 확정되었습니다.`,
          type: "TRADE",
          link: `/products/view/${product.id}`,
          image: imageUrl,
          isPushSent: false,
        },
      });

      await supabase.channel(`user-${targetNotiId}-notifications`).send({
        type: "broadcast",
        event: "notification",
        payload: { ...notification },
      });

      if (canSendPushForType(pref, "TRADE")) {
        const pushRes = await sendPushNotification({
          targetUserId: targetNotiId,
          title: notification.title,
          message: notification.body,
          url: notification.link ?? undefined,
          type: "TRADE",
          image: notification.image ?? undefined,
          tag: `bp-trade-${product.id}`,
          renotify: true,
        });

        if (pushRes.success && (pushRes.data?.sent ?? 0) > 0) {
          await db.notification.update({
            where: { id: notification.id },
            data: { isPushSent: true, sentAt: new Date() },
          });
        }
      }
    }

    return {
      success: true,
      data: { productId: apt.chatRoom.productId, sellerId, buyerId },
    };
  } catch (error: any) {
    if (error.message === "ALREADY_PROCESSED_APT")
      return { success: false, error: "이미 처리된 약속입니다." };
    if (error.message === "PRODUCT_ALREADY_TRADED")
      return { success: false, error: "이미 거래가 진행 중인 상품입니다." };

    console.error("acceptAppointment error:", error);
    return { success: false, error: "약속 수락 중 오류가 발생했습니다." };
  }
}

/**
 * 약속 거절 또는 취소하기
 *
 * - 제안자(Proposer)가 호출 시: CANCELED (취소)
 * - 수신자(Receiver)가 호출 시: REJECTED (거절)
 * - 트랜잭션 내에서 상태 변경과 시스템 메시지 생성을 수행하여 히스토리 보존
 *
 * @param userId - 취소자
 * @param appointmentId - 해당 약속 ID
 * @returns {Promise<ServiceResult>} 처리 결과
 */
export async function cancelAppointment(
  userId: number,
  appointmentId: number
): Promise<ServiceResult> {
  const apt = await db.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!apt) return { success: false, error: "약속 정보를 찾을 수 없습니다." };

  // 상태 가드: 이미 수락되거나 종료된 약속은 취소할 수 없음
  if (apt.status !== "PENDING") {
    return {
      success: false,
      error: "대기 중인 약속만 취소하거나 거절할 수 있습니다.",
    };
  }

  // 제안자는 취소(CANCELED), 수신자는 거절(REJECTED)
  let nextStatus: "CANCELED" | "REJECTED";
  let systemMsgText = "";

  if (apt.proposerId === userId) {
    nextStatus = "CANCELED";
    systemMsgText = "제안자가 약속을 취소했습니다.";
  } else if (apt.receiverId === userId) {
    nextStatus = "REJECTED";
    systemMsgText = "상대방이 약속을 거절했습니다.";
  } else {
    return { success: false, error: "권한이 없습니다." };
  }

  try {
    // 트랜잭션으로 상태 변경과 시스템 메시지 생성을 묶음
    const sysMsg = await db.$transaction(async (tx) => {
      // 동시성 방어: 원자적 업데이트
      const updated = await tx.appointment.updateMany({
        where: { id: appointmentId, status: "PENDING" },
        data: { status: nextStatus },
      });

      if (updated.count === 0) {
        throw new Error("ALREADY_PROCESSED");
      }

      // 시스템 메시지 기록
      const message = await tx.productMessage.create({
        data: {
          type: "SYSTEM",
          userId,
          productChatRoomId: apt.chatRoomId,
          payload: systemMsgText,
        },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
        },
      });

      await tx.productChatRoom.update({
        where: { id: apt.chatRoomId },
        data: { updated_at: new Date() },
      });

      return message;
    });

    // 상태 변경 이벤트 전송
    await supabase.channel(`room-${apt.chatRoomId}`).send({
      type: "broadcast",
      event: "appointment_update",
      payload: { id: appointmentId, status: nextStatus },
    });

    // 시스템 메시지 이벤트 전송
    await supabase.channel(`room-${apt.chatRoomId}`).send({
      type: "broadcast",
      event: "message",
      payload: mapToChatMessage(sysMsg),
    });

    return { success: true };
  } catch (error: any) {
    if (error.message === "ALREADY_PROCESSED") {
      return { success: false, error: "이미 처리된 약속입니다." };
    }
    return { success: false, error: "처리 중 오류가 발생했습니다." };
  }
}
