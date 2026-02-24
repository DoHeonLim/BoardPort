/**
 * File Name : features/chat/service/room.ts
 * Description : 채팅방 관리 비즈니스 로직 (조회, 생성, 권한, 나가기)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.13  임도헌   Created   채팅 목록 fetch 로직 분리
 * 2025.11.21  임도헌   Modified  방별 unreadCount 서버 계산 추가
 * 2026.01.02  임도헌   Modified  채팅 목록 캐시 wrapper(getCachedChatRooms) 추가(태그 통합)
 * 2026.01.03  임도헌   Modified  unreadCount N+1 제거: groupBy 배치 카운트로 최적화(쿼리 2회)
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 * 2026.01.22  임도헌   Modified  lib/room/* 파일 통합 및 Session 의존성 제거, 로직 최적화
 * 2026.01.28  임도헌   Modified  주석 보강
 * 2026.02.04  임도헌   Modified  채팅 목록 조회 시 차단 유저 필터링 로직 추가
 * 2026.02.04  임도헌   Modified  채팅방 생성 전 차단 관계 검증(checkBlockRelation) 추가
 * 2026.02.19  임도헌   Modified  lastMessage 매핑 시 약속 정보 포함 및 텍스트 가공
 * 2026.02.21  임도헌   Modified  방 나가기 시 "시스템 메시지" 실시간 발송 추가
 * 2026.02.21  임도헌   Modified  채팅방에 유저가 나갈 시 더미 유저 만들어서 기존 채팅 내역 보호
 * 2026.02.22  임도헌   Modified  채팅방 나가기 시 해당 방의 PENDING 약속 일괄 취소 로직 추가
 * 2026.02.22  임도헌   Modified  채팅방 나가기 시 상대방(Counterparty) ID 반환 추가
 * 2026.02.23  임도헌   Modified  나간 방 재입장 시 기존 대화 내역을 유지하며 양측 모두 재연결되도록 UX 개선
 */

import "server-only";
import { unstable_cache as nextCache } from "next/cache";
import db from "@/lib/db";
import * as T from "@/lib/cacheTags";
import {
  getBlockedUserIds,
  checkBlockRelation,
} from "@/features/user/service/block";
import { validateUserStatus } from "@/features/user/service/admin";
import { mapToChatMessage } from "@/features/chat/utils/converter";
import type { ChatRoom, ChatUser } from "@/features/chat/types";
import type { ServiceResult } from "@/lib/types";
import { supabase } from "@/lib/supabase";

/* -------------------------------------------------------------------------- */
/*                                 Read Logic                                 */
/* -------------------------------------------------------------------------- */

/**
 * 채팅방 목록 조회 (Unread Count 포함)
 * - 사용자가 참여 중인 채팅방 목록을 최신순으로 반환
 * - 나와 차단 관계(내가 차단했거나, 나를 차단한)에 있는 유저와의 채팅방은 목록에서 제외
 * - N+1 문제 방지를 위해 읽지 않은 메시지 수는 별도 배치 쿼리로 집계
 *
 * @param {number} userId - 조회할 사용자 ID
 * @returns {Promise<ChatRoom[]>} 차단 필터링이 적용된 채팅방 목록
 */
export async function getChatRooms(userId: number): Promise<ChatRoom[]> {
  // 1. 차단 관계 유저 ID 목록 조회
  const blockedIds = await getBlockedUserIds(userId);

  // 2. 참여 중인 채팅방 + 상대방/제품/마지막 메시지 조회
  const chatRooms = await db.productChatRoom.findMany({
    where: {
      users: {
        some: { id: userId },
        // 차단된 유저가 포함되지 않은 방만 조회 (나를 제외한 참여자 중 차단된 사람이 없어야 함)
        none: { id: { in: blockedIds } },
      },
      messages: { some: {} }, // 메시지가 없는 방은 목록에서 제외
    },
    include: {
      users: {
        where: { NOT: { id: userId } }, // 상대방 유저 정보
        select: { id: true, username: true, avatar: true },
        take: 1, // 1:1 채팅 가정
      },
      product: {
        select: {
          id: true,
          title: true,
          images: { where: { order: 0 }, select: { url: true }, take: 1 },
        },
      },
      messages: {
        orderBy: { created_at: "desc" },
        take: 1, // 마지막 메시지 1개
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          appointment: true,
        },
      },
    },
    orderBy: {
      updated_at: "desc", // 최근 대화 순 정렬
    },
  });

  if (chatRooms.length === 0) return [];

  // 3. Unread Count 배치 조회 (GROUP BY)
  const roomIds = chatRooms.map((r) => r.id);
  const unreadGrouped = await db.productMessage.groupBy({
    by: ["productChatRoomId"],
    where: {
      productChatRoomId: { in: roomIds, not: null },
      isRead: false,
      userId: { not: userId },
    },
    _count: { _all: true },
  });

  const unreadMap = new Map<string, number>();
  for (const row of unreadGrouped) {
    if (!row.productChatRoomId) continue;
    unreadMap.set(row.productChatRoomId, row._count._all);
  }

  // 4. DTO 매핑
  return chatRooms.flatMap((room): ChatRoom[] => {
    // 상대방이 방을 나갔을 경우(users 배열이 비었을 때) 안전장치 추가
    const counterparty = room.users[0] ?? {
      id: 0,
      username: "(알 수 없음)",
      avatar: null,
      hasLeft: true,
    };

    const lastRaw = room.messages[0];
    if (!lastRaw) return [];

    // 공통 컨버터 사용
    const lastMessage = mapToChatMessage(lastRaw);

    // 리스트 미리보기용 텍스트 분기 처리
    if (lastMessage.type === "APPOINTMENT") {
      lastMessage.payload = "📅 약속 제안이 도착했습니다.";
    } else if (lastMessage.type === "IMAGE") {
      lastMessage.payload = "📷 사진을 보냈습니다.";
    } else if (lastMessage.type === "SYSTEM") {
      lastMessage.payload = `📢 ${lastMessage.payload}`;
    }

    return [
      {
        id: room.id,
        created_at: room.created_at,
        updated_at: room.updated_at,
        product: {
          id: room.product.id,
          title: room.product.title,
          imageUrl: room.product.images[0]?.url ?? "",
        },
        users: [counterparty],
        lastMessage,
        unreadCount: unreadMap.get(room.id) ?? 0,
      },
    ];
  });
}

/**
 * 채팅방 목록 캐시 Wrapper
 * - 사용자별 채팅방 목록을 캐싱하며, 상품/메시지 변화뿐만 아니라 차단 상태 변화 시에도 캐시를 갱신
 * - 태그: CHAT_ROOMS_ID(userId), CHAT_ROOMS(), USER_BLOCK_UPDATE(userId)
 *
 * @param {number} userId - 사용자 ID
 */
export const getCachedChatRooms = (userId: number): Promise<ChatRoom[]> => {
  return nextCache(() => getChatRooms(userId), [`chat-rooms-user-${userId}`], {
    tags: [
      T.CHAT_ROOMS_ID(userId),
      T.CHAT_ROOMS(),
      T.USER_BLOCK_UPDATE(userId), // 차단 시 목록 갱신
    ],
  })();
};

/**
 * 채팅방 상단에 표시할 제품 정보 조회 (이미지/가격/상태)
 */
export const getChatRoomDetails = async (productId: number) => {
  return db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      title: true,
      price: true,
      images: {
        where: { order: 0 },
        select: { url: true },
        take: 1,
      },
      userId: true,
      purchase_userId: true,
      reservation_userId: true,
    },
  });
};

/**
 * 채팅방 접근 권한 확인
 * 채팅방이 존재하고, 해당 사용자가 참여자인지 검사
 */
export async function checkChatRoomAccess(chatRoomId: string, userId: number) {
  const room = await db.productChatRoom.findUnique({
    where: { id: chatRoomId },
    include: {
      users: { select: { id: true } },
      product: { select: { id: true } },
    },
  });

  if (!room) return null;
  const canSee = room.users.some((user) => user.id === userId);
  return canSee ? room : null;
}

/**
 * 채팅방 상대방 유저 정보 조회
 * 1:1 채팅 기준으로 Viewer가 아닌 다른 참여자를 반환
 */
export async function getCounterpartyInChatRoom(
  chatRoomId: string,
  viewerId: number
): Promise<ChatUser | null> {
  const room = await db.productChatRoom.findFirst({
    where: {
      id: chatRoomId,
      users: { some: { id: viewerId } },
    },
    select: {
      users: {
        where: { NOT: { id: viewerId } },
        select: { id: true, username: true, avatar: true },
        take: 1,
      },
    },
  });

  if (!room) return null; // 방 자체가 없으면 null

  // 내가 방에 있는데 상대방 목록이 0명이면? 상대방이 나간 것
  if (room.users.length === 0) {
    return {
      id: 0,
      username: "(알 수 없음)",
      avatar: null,
      hasLeft: true,
    };
  }

  const other = room.users[0];
  return {
    id: other.id,
    username: other.username,
    avatar: other.avatar ?? null,
    hasLeft: false,
  };
}

/* -------------------------------------------------------------------------- */
/*                                Write Logic                                 */
/* -------------------------------------------------------------------------- */

/**
 * 채팅방 생성
 *
 * 1. 상품 존재 여부 및 본인 상품인지 검증
 * 2. 상대방(판매자)의 이용 정지 여부 및 양방향 차단 관계를 확인
 * 3. `roomCreationLocks`(In-Memory Set)를 사용하여 동일 유저+상품 조합의 중복 생성 요청을 방어
 * 4. 기존에 참여했다가 나간 방(Ghost Room)이 있다면, 유저를 다시 연결(connect)하고
 *    '대화가 다시 시작되었습니다' 시스템 메시지를 발송하여 복구
 * 5. 방이 없으면 신규 생성
 *
 * @param {number} userId - 요청자 ID
 * @param {number} productId - 제품 ID
 * @returns {Promise<string>} 생성된 또는 기존의 채팅방 ID
 * @throws {Error} 존재하지 않는 제품이거나 차단된 사용자인 경우
 */
export async function createChatRoom(
  userId: number,
  productId: number
): Promise<string> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { userId: true },
  });

  if (!product) throw new Error("존재하지 않는 제품입니다.");
  if (product.userId === userId)
    throw new Error("자신의 제품에는 채팅할 수 없습니다.");

  // 보안 체크
  const ownerStatus = await validateUserStatus(product.userId);
  if (!ownerStatus.success) {
    throw new Error("운영 정책 위반으로 이용이 정지된 사용자의 상품입니다.");
  }
  const isBlocked = await checkBlockRelation(userId, product.userId);
  if (isBlocked) {
    throw new Error("차단된 사용자 대화할 수 없습니다.");
  }

  // 1. 기존 방 탐색
  // (내가 참여 중이거나, 내가 나갔던 흔적이 있는 방)
  const existingRoom = await db.productChatRoom.findFirst({
    where: {
      productId,
      OR: [
        { users: { some: { id: userId } } },
        { messages: { some: { userId: userId } } },
      ],
    },
    include: { users: { select: { id: true } } },
  });

  if (existingRoom) {
    // 방 복구 로직 (connect)
    const amIInRoom = existingRoom.users.some((u) => u.id === userId);
    const isSellerInRoom = existingRoom.users.some(
      (u) => u.id === product.userId
    );

    const connectData = [];
    if (!amIInRoom) connectData.push({ id: userId });
    if (!isSellerInRoom) connectData.push({ id: product.userId });

    if (connectData.length > 0) {
      await db.productChatRoom.update({
        where: { id: existingRoom.id },
        data: {
          users: { connect: connectData },
          updated_at: new Date(),
        },
      });

      // 시스템 메시지 발송
      const sysMsg = await db.productMessage.create({
        data: {
          type: "SYSTEM",
          userId,
          productChatRoomId: existingRoom.id,
          payload: "대화가 다시 시작되었습니다.",
        },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
        },
      });

      await supabase.channel(`room-${existingRoom.id}`).send({
        type: "broadcast",
        event: "message",
        payload: mapToChatMessage(sysMsg),
      });
    }
    return existingRoom.id;
  }

  // 2. 신규 생성
  const room = await db.productChatRoom.create({
    data: {
      users: { connect: [{ id: product.userId }, { id: userId }] },
      product: { connect: { id: productId } },
    },
    select: { id: true },
  });

  return room.id;
}

/**
 * 채팅방 나가기
 *
 * 1. 채팅방 존재 및 참여 여부 검증
 * 2. 해당 방에 연결된 PENDING 상태의 약속을 일괄 취소 처리 (상태 고립 방지)
 * 3. 상대방이 남아있는 경우:
 *    - 시스템 메시지 DB 저장 ("상대방이 나갔습니다")
 *    - 채팅방 updated_at 갱신 및 내 계정 연결 해제
 *    - 실시간 소켓으로 상대방에게 시스템 메시지 전송
 * 4. 상대방이 없는 경우 (나 혼자 남은 방):
 *    - 내 계정 연결 해제
 * 5. 방에 남은 인원이 0명이면 채팅방을 물리적으로 삭제 (Cascade로 메시지/약속 자동 정리)
 *
 * @param chatRoomId - 채팅방 ID
 * @param userId - 요청자 ID
 * @returns 캐시 무효화를 위해 본인 및 상대방 ID 반환
 */
export async function leaveChatRoom(
  chatRoomId: string,
  userId: number
): Promise<ServiceResult<{ userId: number; counterpartyId?: number }>> {
  try {
    const room = await db.productChatRoom.findUnique({
      where: { id: chatRoomId },
      select: {
        id: true,
        users: { select: { id: true } },
      },
    });

    if (!room) return { success: false, error: "채팅방을 찾을 수 없습니다." };

    const isMember = room.users.some((u) => u.id === userId);
    if (!isMember) {
      return { success: false, error: "이미 이 채팅방에 속해있지 않습니다." };
    }

    // 상대방 존재 여부 명시적 확인
    const counterparty = room.users.find((u) => u.id !== userId);
    const remainingCount = room.users.length - 1;

    // 1. PENDING 약속 취소 (방을 나갈 때 무조건 정리)
    const pendingApts = await db.appointment.findMany({
      where: { chatRoomId, status: "PENDING" },
      select: { id: true },
    });

    if (pendingApts.length > 0) {
      await db.appointment.updateMany({
        where: { id: { in: pendingApts.map((a) => a.id) } },
        data: { status: "CANCELED" },
      });

      for (const apt of pendingApts) {
        await supabase.channel(`room-${chatRoomId}`).send({
          type: "broadcast",
          event: "appointment_update",
          payload: { id: apt.id, status: "CANCELED" },
        });
      }
    }

    // 2. 상대방이 남아있는 경우: 시스템 메시지 저장 및 방 업데이트
    if (counterparty) {
      const sysMsg = await db.$transaction(async (tx) => {
        // DB에 영구적으로 시스템 메시지 저장 (나중에 들어와도 보임)
        const msg = await tx.productMessage.create({
          data: {
            type: "SYSTEM",
            userId, // 나가는 사람을 주체로 기록
            productChatRoomId: chatRoomId,
            payload: "대화 상대가 채팅방을 나갔습니다.",
          },
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        });

        // [Fix] 방의 updated_at을 갱신하여 상대방의 채팅 목록 최상단으로 끌어올림 + 유저 연결 해제
        await tx.productChatRoom.update({
          where: { id: chatRoomId },
          data: {
            updated_at: new Date(),
            users: { disconnect: { id: userId } },
          },
        });

        return msg;
      });

      // 실시간 소켓으로 상대방 화면에 즉시 렌더링
      await supabase.channel(`room-${chatRoomId}`).send({
        type: "broadcast",
        event: "message",
        payload: mapToChatMessage(sysMsg),
      });
    } else {
      // 3. 상대방이 없는 경우 (나 혼자 남았던 방): 연결 해제만 수행
      await db.productChatRoom.update({
        where: { id: chatRoomId },
        data: { users: { disconnect: { id: userId } } },
      });
    }

    // 4. 아무도 없으면 방 삭제 (Cascade로 메시지, 약속 모두 자동 삭제됨)
    if (remainingCount <= 0) {
      await db.productChatRoom.delete({ where: { id: chatRoomId } });
    }

    return {
      success: true,
      data: { userId, counterpartyId: counterparty?.id },
    };
  } catch (error) {
    console.error("leaveChatRoom error:", error);
    return { success: false, error: "채팅방 나가기 중 문제가 발생했습니다." };
  }
}
