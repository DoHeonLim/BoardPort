/**
 * File Name : features/chat/lib/room/createChatRoom.ts
 * Description : 채팅방 생성 Prisma 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.13  임도헌   Created   채팅방 생성 로직 분리
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 */

import db from "@/lib/db";

/**
 * createChatRoom
 * - 제품 소유자와 현재 사용자의 조합으로 채팅방을 생성
 * - 이미 존재하는 채팅방이 있다면 기존 ID 반환
 *
 * userId - 현재 사용자 ID
 * productId - 대상 제품 ID
 * @returns 채팅방 ID (기존 또는 새로 생성된 것)
 */
export async function createChatRoom(userId: number, productId: number) {
  // 1. 제품이 존재하는지 확인
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { userId: true }, // 제품 소유자 ID만 조회
  });

  if (!product) throw new Error("존재하지 않는 제품입니다.");

  // 2. 해당 제품에 대해 두 사용자가 참여한 채팅방이 이미 존재하는지 확인
  const existingRoom = await db.productChatRoom.findFirst({
    where: {
      productId,
      users: {
        every: {
          id: { in: [product.userId, userId] }, // 두 명 모두 포함해야 함
        },
      },
    },
    select: { id: true },
  });

  // 2-1. 존재하면 해당 채팅방 ID 반환
  if (existingRoom) return existingRoom.id;

  // 3. 존재하지 않으면 새 채팅방 생성
  const room = await db.productChatRoom.create({
    data: {
      users: {
        connect: [{ id: product.userId }, { id: userId }], // 두 유저 연결
      },
      product: {
        connect: { id: productId },
      },
    },
    select: { id: true }, // 생성된 채팅방 ID만 반환
  });

  // 4. 생성된 채팅방 ID 반환
  return room.id;
}
