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
 * 2026.03.07  임도헌   Modified  약속 관련 실패 문구를 구체화(v1.2)
 * 2026.04.02  임도헌   Modified  약속 서비스 JSDoc 태그 형식 정리
 * 2026.05.16  임도헌   Modified  약속 처리 에러 분기를 unknown-safe 방식으로 정리
 * 2026.05.25  임도헌   Modified  약속 수락 가드/거래 참여자 산정 규칙을 테스트 가능한 유틸로 분리
 * 2026.05.25  임도헌   Modified  약속 제안 시간/거래 가능 상태/상대방 식별 규칙을 테스트 가능한 유틸로 분리
 * 2026.06.21  임도헌   Modified  약속 제안 수신자에게 거래 알림 전송 추가
 * 2026.06.21  임도헌   Modified  약속 취소/거절 결과를 상대방에게 거래 알림으로 전송
 * 2026.06.21  임도헌   Modified  약속 수락 알림 실패가 수락 처리를 막지 않도록 정리
 * 2026.08.21  임도헌   Modified  알림·상품 채팅 발신을 서버 전용 private Broadcast로 전환
 * 2026.08.26  임도헌   Modified  PENDING 약속 DB 단일 제약과 commit 이후 Realtime·알림 실패 격리
 */

import "server-only";
import db from "@/lib/db";
import { realtimeServer as supabase } from "@/features/realtime/service/broadcast";
import {
  notificationRealtimeTopic,
  productChatRealtimeTopic,
} from "@/features/realtime/topics";
import { validateUserStatus } from "@/features/user/service/admin";
import { checkBlockRelation } from "@/features/user/service/block";
import { mapToChatMessage } from "@/features/chat/utils/converter";
import {
  getAppointmentAcceptanceGuardError,
  getAppointmentProposalTimeError,
  getProductTradeAvailabilityError,
  resolveAppointmentReceiverId,
  resolveAppointmentTradeParties,
} from "@/features/chat/utils/appointmentTrade";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/utils/policy";
import { sendPushNotification } from "@/features/notification/service/sender";
import type { ServiceResult } from "@/lib/types";
import type { ChatMessage } from "@/features/chat/types";
import type { LocationData } from "@/features/map/types";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "";

/** 거래 약속 변경 알림을 DB·private Realtime·Push 경계로 전달한다. */
async function sendAppointmentTradeNotification({
  targetUserId,
  title,
  body,
  link,
  image,
  tag,
}: {
  targetUserId: number;
  title: string;
  body: string;
  link: string;
  image?: string;
  tag: string;
}) {
  const pref = await db.notificationPreferences.findUnique({
    where: { userId: targetUserId },
  });

  if (!pref || isNotificationTypeEnabled(pref, "TRADE")) {
    const notification = await db.notification.create({
      data: {
        userId: targetUserId,
        title,
        body,
        type: "TRADE",
        link,
        image,
        isPushSent: false,
      },
    });

    // Realtime 전달 실패가 Push 시도까지 건너뛰게 하지 않는다.
    const realtimeResult = await Promise.allSettled([
      supabase.channel(notificationRealtimeTopic(targetUserId)).send({
        type: "broadcast",
        event: "notification",
        payload: { ...notification },
      }),
    ]);
    if (realtimeResult[0]?.status === "rejected") {
      console.warn(
        "[Appointment] Notification realtime delivery failed:",
        realtimeResult[0].reason
      );
    }

    if (canSendPushForType(pref, "TRADE")) {
      const pushRes = await sendPushNotification({
        targetUserId,
        title: notification.title,
        message: notification.body,
        url: notification.link ?? undefined,
        type: "TRADE",
        image: notification.image ?? undefined,
        tag,
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
}

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
 * @param {number} userId - 제안자 ID
 * @param {string} chatRoomId - 채팅방 ID
 * @param {{ meetDate: Date; location: LocationData }} data - 약속 일시와 장소 정보
 * @returns {Promise<ServiceResult<ChatMessage>>} 생성된 약속 메시지 또는 실패 정보
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
  const proposalTimeError = getAppointmentProposalTimeError({
    meetDate: data.meetDate,
  });
  if (proposalTimeError) return { success: false, error: proposalTimeError };

  // 3. 채팅방 및 상품 상태 조회
  const room = await db.productChatRoom.findUnique({
    where: { id: chatRoomId },
    include: {
      users: { select: { id: true } },
      product: {
        select: {
          id: true,
          title: true,
          purchase_userId: true,
          reservation_userId: true,
          images: { take: 1, select: { url: true } },
        },
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
  const tradeAvailabilityError = getProductTradeAvailabilityError({
    purchaseUserId: room.product.purchase_userId,
    reservationUserId: room.product.reservation_userId,
  });
  if (tradeAvailabilityError)
    return { success: false, error: tradeAvailabilityError };

  // 수신자 식별 및 차단 관계 확인
  const receiverId = resolveAppointmentReceiverId(
    room.users.map((user) => user.id),
    userId
  );
  if (!receiverId) {
    return { success: false, error: "대화 상대를 찾을 수 없습니다." };
  }

  const isBlocked = await checkBlockRelation(userId, receiverId);
  if (isBlocked) {
    return {
      success: false,
      error: "차단된 상대와는 약속을 잡을 수 없습니다.",
    };
  }

  try {
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

      // 실제로 취소할 PENDING 약속을 transaction 안에서 확정해 후속 이벤트와 일치시킨다.
      const pendingApts = await tx.appointment.findMany({
        where: { chatRoomId, status: "PENDING" },
        select: { id: true },
      });
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
          receiverId,
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

      return {
        message,
        canceledAppointmentIds: pendingApts.map(
          (appointment) => appointment.id
        ),
      };
    });

    // 5. 실시간 브로드캐스트
    // DB commit 성공과 Realtime 전달 실패를 분리해 저장된 제안을 실패로 오인하지 않는다.
    await Promise.allSettled([
      ...result.canceledAppointmentIds.map((appointmentId) =>
        supabase.channel(productChatRealtimeTopic(chatRoomId)).send({
          type: "broadcast",
          event: "appointment_update",
          payload: { id: appointmentId, status: "CANCELED" },
        })
      ),
      supabase.channel(productChatRealtimeTopic(chatRoomId)).send({
        type: "broadcast",
        event: "message",
        payload: mapToChatMessage(result.message),
      }),
    ]);

    const chatMessage = mapToChatMessage(result.message);

    try {
      await sendAppointmentTradeNotification({
        targetUserId: receiverId,
        title: "거래 약속이 제안되었습니다",
        body: `'${room.product.title}' 상품의 거래 약속 제안을 확인해주세요.`,
        link: `/chats/${chatRoomId}`,
        image: room.product.images?.[0]?.url
          ? `${room.product.images[0].url}/public`
          : undefined,
        tag: `bp-trade-appointment-${chatRoomId}`,
      });
    } catch (notificationError) {
      console.warn(
        "[Appointment] Proposal notification failed:",
        notificationError
      );
    }

    return { success: true, data: chatMessage };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message === "PRODUCT_ALREADY_TRADED") {
      return { success: false, error: "이미 거래가 진행 중인 상품입니다." };
    }
    console.error("proposeAppointment error:", error);
    return {
      success: false,
      error:
        "약속 제안에 실패했습니다. 날짜와 장소 정보를 확인한 뒤 다시 시도해주세요.",
    };
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
 * @param {number} userId - 수락 요청자 ID
 * @param {number} appointmentId - 약속 ID
 * @returns {Promise<ServiceResult<{ productId: number; sellerId: number; buyerId: number }>>} 변경된 상품 및 거래자 정보
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

  // 2. Ghost User & 차단 가드
  const guardError = getAppointmentAcceptanceGuardError({
    requesterId: userId,
    proposerId: apt.proposerId,
    receiverId: apt.receiverId,
    roomUserIds: apt.chatRoom.users.map((user) => user.id),
    status: apt.status,
    meetDate: apt.meetDate,
  });
  if (guardError) return { success: false, error: guardError };

  const isBlocked = await checkBlockRelation(userId, apt.proposerId);
  if (isBlocked) {
    return {
      success: false,
      error: "차단된 사용자와는 약속을 진행할 수 없습니다.",
    };
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

  const tradeParties = resolveAppointmentTradeParties({
    sellerId: product.userId,
    proposerId: apt.proposerId,
    receiverId: apt.receiverId,
  });

  // 본인 거래 방지
  if (!tradeParties) {
    return {
      success: false,
      error: "비정상적인 거래 대상입니다.",
    };
  }
  const { sellerId, buyerId } = tradeParties;

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

    // 5. commit 이후 Realtime 실패는 저장된 수락 결과와 분리한다.
    await Promise.allSettled([
      supabase.channel(productChatRealtimeTopic(apt.chatRoomId)).send({
        type: "broadcast",
        event: "message",
        payload: mapToChatMessage(sysMsg),
      }),
      supabase.channel(productChatRealtimeTopic(apt.chatRoomId)).send({
        type: "broadcast",
        event: "appointment_update",
        payload: { id: appointmentId, status: "ACCEPTED" },
      }),
      ...canceledApts.map((canceled) =>
        supabase.channel(productChatRealtimeTopic(canceled.chatRoomId)).send({
          type: "broadcast",
          event: "appointment_update",
          payload: { id: canceled.id, status: "CANCELED" },
        })
      ),
    ]);

    // 6. 알림 전송 (상대방에게)
    const targetNotiId = userId === buyerId ? sellerId : buyerId;
    try {
      await sendAppointmentTradeNotification({
        targetUserId: targetNotiId,
        title: "상품이 예약되었습니다",
        body: `'${product.title}' 상품의 거래 약속이 확정되었습니다.`,
        link: `/products/view/${product.id}`,
        image: product.images?.[0]?.url
          ? `${product.images[0].url}/public`
          : undefined,
        tag: `bp-trade-${product.id}`,
      });
    } catch (notificationError) {
      console.warn(
        "[Appointment] Acceptance notification failed:",
        notificationError
      );
    }

    return {
      success: true,
      data: { productId: apt.chatRoom.productId, sellerId, buyerId },
    };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message === "ALREADY_PROCESSED_APT")
      return { success: false, error: "이미 처리된 약속입니다." };
    if (message === "PRODUCT_ALREADY_TRADED")
      return { success: false, error: "이미 거래가 진행 중인 상품입니다." };

    console.error("acceptAppointment error:", error);
    return {
      success: false,
      error: "약속 수락에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

/**
 * 약속 거절 또는 취소하기
 *
 * - 제안자(Proposer)가 호출 시: CANCELED (취소)
 * - 수신자(Receiver)가 호출 시: REJECTED (거절)
 * - 트랜잭션 내에서 상태 변경과 시스템 메시지 생성을 수행하여 히스토리 보존
 *
 * @param {number} userId - 취소/거절 요청자 ID
 * @param {number} appointmentId - 해당 약속 ID
 * @returns {Promise<ServiceResult>} 취소 또는 거절 처리 결과
 */
export async function cancelAppointment(
  userId: number,
  appointmentId: number
): Promise<ServiceResult> {
  const apt = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      chatRoom: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              images: { take: 1, select: { url: true } },
            },
          },
        },
      },
    },
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

    // commit 이후 Realtime 실패는 저장된 취소·거절 결과와 분리한다.
    await Promise.allSettled([
      supabase.channel(productChatRealtimeTopic(apt.chatRoomId)).send({
        type: "broadcast",
        event: "appointment_update",
        payload: { id: appointmentId, status: nextStatus },
      }),
      supabase.channel(productChatRealtimeTopic(apt.chatRoomId)).send({
        type: "broadcast",
        event: "message",
        payload: mapToChatMessage(sysMsg),
      }),
    ]);

    try {
      const targetUserId =
        nextStatus === "REJECTED" ? apt.proposerId : apt.receiverId;
      const title =
        nextStatus === "REJECTED"
          ? "거래 약속이 거절되었습니다"
          : "거래 약속이 취소되었습니다";
      const body =
        nextStatus === "REJECTED"
          ? `'${apt.chatRoom.product.title}' 상품의 거래 약속 제안이 거절되었습니다.`
          : `'${apt.chatRoom.product.title}' 상품의 거래 약속 제안이 취소되었습니다.`;

      await sendAppointmentTradeNotification({
        targetUserId,
        title,
        body,
        link: `/chats/${apt.chatRoomId}`,
        image: apt.chatRoom.product.images?.[0]?.url
          ? `${apt.chatRoom.product.images[0].url}/public`
          : undefined,
        tag: `bp-trade-appointment-${apt.chatRoomId}`,
      });
    } catch (notificationError) {
      console.warn(
        "[Appointment] Cancel/reject notification failed:",
        notificationError
      );
    }

    return { success: true };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message === "ALREADY_PROCESSED") {
      return { success: false, error: "이미 처리된 약속입니다." };
    }
    return {
      success: false,
      error: "약속 처리에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}
