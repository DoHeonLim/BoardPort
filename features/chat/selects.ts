/**
 * File Name : features/chat/selects.ts
 * Description : 채팅 도메인 Prisma include/select 정의
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.16  임도헌   Created   채팅 메시지 조회 include를 constants.ts에서 분리
 */

import { Prisma } from "@/generated/prisma/client";

/** 채팅 메시지 조회 공통 include */
export const MESSAGE_INCLUDE = {
  user: { select: { id: true, username: true, avatar: true } },
  appointment: true,
  reactions: {
    select: { reactionKey: true, userId: true },
  },
} satisfies Prisma.ProductMessageInclude;
