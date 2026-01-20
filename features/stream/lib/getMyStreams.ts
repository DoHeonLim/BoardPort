/**
 * File Name : features/stream/lib/getMyStreams.ts
 * Description : 내 방송 목록 조회 (Broadcast 스키마 기준)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.30  임도헌   Created   내 방송 목록 조회 로직 분리 (legacy LiveStream)
 * 2025.09.20  임도헌   Modified  Broadcast/LiveInput 스키마로 마이그레이션
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 */

import "server-only";
import db from "@/lib/db";

export const getMyStreams = async (userId: number, take: number) => {
  if (!Number.isFinite(userId) || !Number.isFinite(take)) return [];

  // 내 채널(= 내 LiveInput)에서 생성된 Broadcast들
  return await db.broadcast.findMany({
    where: {
      liveInput: { userId },
    },
    orderBy: { id: "desc" },
    take,
    select: {
      id: true,
      title: true,
      description: true,
      thumbnail: true,
      visibility: true, // "PUBLIC" | "FOLLOWERS" | "PRIVATE"
      status: true, // "CONNECTED" | "DISCONNECTED" | "ENDED" ...
      started_at: true,
      ended_at: true,
      category: { select: { id: true, kor_name: true, icon: true } },
      tags: { select: { name: true } },
      liveInput: {
        select: {
          user: { select: { username: true, avatar: true } },
        },
      },
    },
  });
};
