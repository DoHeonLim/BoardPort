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
 */

import "server-only";
import { unstable_cache as nextCache } from "next/cache";
import db from "@/lib/db";
import * as T from "@/lib/cacheTags";
import { ChatRoom, ChatUser } from "@/features/chat/types";
import type { ServiceResult } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/*                                 Read Logic                                 */
/* -------------------------------------------------------------------------- */

/**
 * 채팅방 목록 조회 (Unread Count 포함)
 * 사용자가 참여 중인 채팅방 목록을 최신순으로 반환합니다.
 * N+1 문제 방지를 위해 읽지 않은 메시지 수는 별도 배치 쿼리로 집계합니다.
 *
 * @param {number} userId - 조회할 사용자 ID
 * @returns {Promise<ChatRoom[]>} 채팅방 목록
 */
export async function getChatRooms(userId: number): Promise<ChatRoom[]> {
  // 1. 참여 중인 채팅방 + 상대방/제품/마지막 메시지 조회
  const chatRooms = await db.productChatRoom.findMany({
    where: {
      users: { some: { id: userId } },
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
          images: {
            where: { order: 0 },
            select: { url: true },
            take: 1,
          },
        },
      },
      messages: {
        orderBy: { created_at: "desc" },
        take: 1, // 마지막 메시지 1개
        select: {
          id: true,
          payload: true,
          created_at: true,
          isRead: true,
          productChatRoomId: true,
          user: {
            select: { id: true, username: true, avatar: true },
          },
        },
      },
    },
    orderBy: {
      updated_at: "desc", // 최근 대화 순 정렬
    },
  });

  if (chatRooms.length === 0) return [];

  // 2. Unread Count 배치 조회 (GROUP BY)
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

  // 3. DTO 매핑
  return chatRooms.flatMap((room): ChatRoom[] => {
    const last = room.messages[0];
    if (!last) return [];

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
        users: room.users,
        lastMessage: {
          id: last.id,
          payload: last.payload,
          created_at: last.created_at,
          isRead: last.isRead,
          productChatRoomId: last.productChatRoomId!,
          user: last.user,
        },
        unreadCount: unreadMap.get(room.id) ?? 0,
      },
    ];
  });
}

/**
 * 채팅방 목록 캐시 Wrapper
 * - 태그: CHAT_ROOMS_ID(userId), CHAT_ROOMS()
 */
export const getCachedChatRooms = (userId: number): Promise<ChatRoom[]> => {
  return nextCache(() => getChatRooms(userId), [`chat-rooms-user-${userId}`], {
    tags: [T.CHAT_ROOMS_ID(userId), T.CHAT_ROOMS()],
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
 * 채팅방이 존재하고, 해당 사용자가 참여자인지 검사합니다.
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
 * 1:1 채팅 기준으로 Viewer가 아닌 다른 참여자를 반환합니다.
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

  if (!room || room.users.length === 0) return null;
  const other = room.users[0];
  return {
    id: other.id,
    username: other.username,
    avatar: other.avatar ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/*                                Write Logic                                 */
/* -------------------------------------------------------------------------- */

/**
 * 채팅방 생성 (Idempotent)
 * - 이미 존재하는 방이 있다면 해당 방 ID를 반환합니다.
 * - 없다면 제품 판매자와 요청자 간의 새 채팅방을 생성합니다.
 *
 * @param {number} userId - 요청자 ID
 * @param {number} productId - 제품 ID
 * @returns {Promise<string>} 채팅방 ID
 */
export async function createChatRoom(userId: number, productId: number) {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { userId: true },
  });

  if (!product) throw new Error("존재하지 않는 제품입니다.");

  // 기존 방 존재 여부 확인 (제품 + 두 유저)
  const existingRoom = await db.productChatRoom.findFirst({
    where: {
      productId,
      users: {
        every: { id: { in: [product.userId, userId] } },
      },
    },
    select: { id: true },
  });

  if (existingRoom) return existingRoom.id;

  // 새 방 생성
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
 * - 사용자를 채팅방 참여자 목록에서 제거합니다.
 * - 참여자가 아무도 남지 않게 되면 방을 삭제합니다.
 *
 * @param {string} chatRoomId - 채팅방 ID
 * @param {number} userId - 나갈 유저 ID
 */
export async function leaveChatRoom(
  chatRoomId: string,
  userId: number
): Promise<ServiceResult<{ userId: number }>> {
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

    const remainingCount = room.users.length - 1;

    // 참여자 연결 해제
    await db.productChatRoom.update({
      where: { id: chatRoomId },
      data: {
        users: { disconnect: { id: userId } },
      },
    });

    // 아무도 없으면 방 삭제
    if (remainingCount <= 0) {
      await db.productChatRoom.delete({ where: { id: chatRoomId } });
    }

    return { success: true, data: { userId } };
  } catch (error) {
    console.error("leaveChatRoom error:", error);
    return { success: false, error: "채팅방 나가기 중 문제가 발생했습니다." };
  }
}
