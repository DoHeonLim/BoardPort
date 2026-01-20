/**
 * File Name : features/chat/lib/room/getChatRooms.ts
 * Description : 모든 채팅방 불러오기
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.13  임도헌   Created   채팅 목록 fetch 로직 분리
 * 2025.11.21  임도헌   Modified  방별 unreadCount 서버 계산 추가
 * 2026.01.02  임도헌   Modified  채팅 목록 캐시 wrapper(getCachedChatRooms) 추가(태그 통합)
 * 2026.01.03  임도헌   Modified  unreadCount N+1 제거: groupBy 배치 카운트로 최적화(쿼리 2회)
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 */
"use server";

import "server-only";
import db from "@/lib/db";
import { ChatRoom } from "@/types/chat";
import { unstable_cache } from "next/cache";
import * as T from "@/lib/cacheTags";

/**
 * getChatRooms
 * - 로그인된 사용자가 참여 중인 모든 채팅방을 가져옵니다.
 * - 각 채팅방에는 다음 정보가 포함됩니다:
 *   - 상대방 유저 정보
 *   - 해당 제품의 대표 정보 (제목, 이미지)
 *   - 마지막 메시지 1건
 *   - unreadCount: 읽지 않은 메시지 개수
 *
 * Performance Notes
 * - (구버전) room 수만큼 getUnreadCount 호출 → N+1
 * - (현재) unreadCount를 "chatRoomId IN (...)" + groupBy로 1회에 계산 → 총 쿼리 2회
 *
 * userId - 현재 로그인한 사용자 ID
 * @returns ChatRoom[] - 채팅방 목록
 */
export async function getChatRooms(userId: number): Promise<ChatRoom[]> {
  // 1) 채팅방 + 상대방/제품/마지막 메시지 조회
  const chatRooms = await db.productChatRoom.findMany({
    where: {
      users: { some: { id: userId } },
      // 메시지가 1개라도 있는 방만 목록에 노출 (lastMessage null 방 제거)
      messages: { some: {} },
    },
    include: {
      users: {
        where: { NOT: { id: userId } },
        select: { id: true, username: true, avatar: true },
        take: 1, // 1:1 고정: 상대방은 1명만
      },
      product: {
        select: {
          id: true,
          title: true,
          images: {
            where: { order: 0 }, // 대표 이미지 (order: 0)
            select: { url: true },
            take: 1,
          },
        },
      },
      messages: {
        orderBy: { created_at: "desc" }, // 최신 메시지 기준 정렬
        take: 1, // 마지막 메시지 1개만
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
      updated_at: "desc", // 채팅방 최신 업데이트 기준 정렬
    },
  });

  if (chatRooms.length === 0) return [];

  // 2) unreadCount 배치 계산 (N+1 제거)
  // - "내가 속한 방들"에서
  // - "내가 보낸 메시지 제외"
  // - "isRead=false"만
  // 를 roomId로 groupBy하여 count를 만든다.
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

  // 3) 프론트용 구조로 변환 + unreadCount 병합
  const roomsWithUnread = chatRooms.flatMap((room): ChatRoom[] => {
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

  return roomsWithUnread;
}

/**
 * getCachedChatRooms
 * - 채팅방 목록을 userId 단위로 캐시합니다.
 * - Producer: revalidateTag(T.CHAT_ROOMS_ID(userId)) (추천) / T.CHAT_ROOMS() (fallback)
 * - Consumer: unstable_cache tags
 *
 * Notes
 * - page에서 force-dynamic을 제거하면 cached getter의 효용이 커집니다.
 */
export const getCachedChatRooms = (userId: number): Promise<ChatRoom[]> => {
  return unstable_cache(
    () => getChatRooms(userId),
    // keyParts: userId 기준으로 분리
    [`chat-rooms-user-${userId}`],
    {
      // 전역 tag는 긴급 전체 무효화 용도로 보조. 실제 운영은 per-user tag 권장.
      tags: [T.CHAT_ROOMS_ID(userId), T.CHAT_ROOMS()],
    }
  )();
};
