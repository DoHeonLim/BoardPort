/**
 * File Name : features/stream/selects.ts
 * Description : 스트리밍 도메인 Prisma select 정의
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.02  임도헌   Created   constants.ts에서 방송 요약 조회용 Prisma select 분리
 */

import { Prisma } from "@/generated/prisma/client";

/** 방송 목록/요약 조회용 공통 select */
export const BROADCAST_SUMMARY_SELECT = {
  id: true,
  title: true,
  description: true,
  thumbnail: true,
  thumbnailAnimated: true,
  visibility: true,
  status: true,
  started_at: true,
  ended_at: true,
  liveInput: {
    select: {
      provider_uid: true, // stream_id
      userId: true,
      user: { select: { id: true, username: true, avatar: true } },
    },
  },
  category: { select: { id: true, kor_name: true, icon: true } },
  tags: { select: { name: true } },
  vodAssets: {
    where: { ready_at: { not: null } },
    select: { id: true },
    orderBy: { id: "desc" },
    take: 1,
  },
} satisfies Prisma.BroadcastSelect;
