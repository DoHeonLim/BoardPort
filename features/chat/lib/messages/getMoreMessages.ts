/**
 * File Name : features/chat/lib/messages/getMoreMessages.ts
 * Description : 과거 메시지 페이징 로드
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.16  임도헌   Created   과거 메시지 Server Action
 * 2025.07.22  임도헌   Modified  DESC 정렬 후 reverse 로직 설명 추가
 * 2025.11.21  임도헌   Modified  에러 타입 정리
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 */

"use server";

import db from "@/lib/db";
import { ChatMessage } from "@/types/chat";

/**
 * getMoreMessages
 * - 무한스크롤 시 과거 메시지 페이징 로드
 * - 마지막 메시지 id(lastMessageId)를 기준으로 더 이전 메시지 조회
 * - 최종적으로 오래된 → 최신 순서로 반환하여 UI 일관성 유지
 */
export async function getMoreMessages(
  chatRoomId: string,
  lastMessageId: number,
  limit = 20
): Promise<{ success: boolean; data?: ChatMessage[]; error?: string }> {
  try {
    const olderMessages = await db.productMessage.findMany({
      where: {
        productChatRoomId: chatRoomId,
        id: { lt: lastMessageId }, // lt 연산으로 이전 메시지 로드
      },
      orderBy: { created_at: "desc" }, // 최신순(DESC)으로 가져오기
      take: limit, // limit 개수만큼 페이징
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    const data: ChatMessage[] = olderMessages.reverse().map((m) => ({
      id: m.id,
      payload: m.payload,
      created_at: m.created_at,
      isRead: m.isRead,
      // Prisma 타입은 string | null 이지만,
      // 이 함수는 특정 chatRoomId로만 조회하므로
      // null일 경우 현재 chatRoomId로 보정해서 항상 string으로 맞춰줌
      productChatRoomId: m.productChatRoomId ?? chatRoomId,
      user: {
        id: m.user.id,
        username: m.user.username,
        avatar: m.user.avatar,
      },
    }));

    return {
      success: true,
      data,
    };
  } catch (err: unknown) {
    console.error("getMoreMessages error:", err);
    const message =
      err instanceof Error ? err.message : "메시지 로드 중 오류 발생";
    return {
      success: false,
      error: message,
    };
  }
}
