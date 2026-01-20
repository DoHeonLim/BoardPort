/**
 * File Name : features/product/lib/getProductChatUsers.ts
 * Description : 특정 제품에 대해 현재 사용자와 대화한 상대 유저 목록 조회
 * Author : 임도헌
 *
 * History
 * 2025.10.19  임도헌   Created   my-sales/actions에서 분리(도메인 기반 lib로 이동)
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 */

"use server";

import db from "@/lib/db";
import getSession from "@/lib/session";

export type ChatUser = {
  id: number;
  username: string;
  avatar: string | null;
};

export async function getProductChatUsers(
  productId: number
): Promise<ChatUser[]> {
  const session = await getSession();

  const rooms = await db.productChatRoom.findMany({
    where: {
      productId,
      users: { some: { id: session.id! } },
    },
    select: {
      users: {
        where: { NOT: { id: session.id! } },
        select: { id: true, username: true, avatar: true },
      },
    },
  });

  // 중복 제거 + 정렬
  const flat = rooms.flatMap((r) => r.users);
  const map = new Map<number, ChatUser>();
  for (const u of flat) map.set(u.id, u);
  const uniq = Array.from(map.values()).sort((a, b) =>
    (a.username || "").localeCompare(b.username || "", "ko")
  );

  return uniq;
}
