/**
 * File Name : features/product/service/chatUsers.ts
 * Description : 제품 예약자 선택 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.10.19  임도헌   Created   my-sales/actions에서 분리(도메인 기반 lib로 이동)
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 * 2026.01.20  임도헌   Moved     lib/getProductChatUsers -> service/chatUsers (세션 분리)
 * 2026.01.22  임도헌   Modified  주석 보강 (중복 제거 로직 설명)
 */
import "server-only";
import db from "@/lib/db";
import { ChatUser } from "@/features/chat/types";

/**
 * 특정 제품에 대해 현재 사용자와 대화한 상대 유저 목록을 조회합니다.
 * 판매자가 예약자를 지정할 때 사용하며, 중복된 유저를 제거하고 이름순으로 정렬합니다.
 *
 * @param {number} productId - 제품 ID
 * @param {number} userId - 현재 사용자 ID (판매자)
 * @returns {Promise<ChatUser[]>} 대화 상대 목록
 */
export async function getProductChatUsers(
  productId: number,
  userId: number
): Promise<ChatUser[]> {
  // 1. 해당 제품의 채팅방 중 내가 참여한 방 조회
  const rooms = await db.productChatRoom.findMany({
    where: {
      productId,
      users: { some: { id: userId } },
    },
    select: {
      users: {
        where: { NOT: { id: userId } }, // 나를 제외한 상대방 정보만
        select: { id: true, username: true, avatar: true },
      },
    },
  });

  // 2. 중복 제거 (Map 활용) 및 이름순 정렬
  const flat = rooms.flatMap((r) => r.users);
  const map = new Map<number, ChatUser>();
  for (const u of flat) map.set(u.id, u);

  const uniq = Array.from(map.values()).sort((a, b) =>
    (a.username || "").localeCompare(b.username || "", "ko")
  );

  return uniq;
}
