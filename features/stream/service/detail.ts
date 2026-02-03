/**
 * File Name : features/stream/service/detail.ts
 * Description : 방송 및 녹화본 상세 정보 조회 통합
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.30  임도헌   Created   app/streams/[id]/actions에서 코드 분리
 * 2025.09.22  임도헌   Modified  StreamDetail/StreamChatRoom 사용 필드만 엄선, status는 DB 값 그대로 유지
 * 2026.01.19  임도헌   Moved      lib/stream -> features/stream/lib
 * 2026.01.23  임도헌   Merged    getBroadcastDetail + getVodDetail 통합
 * 2026.01.28  임도헌   Modified  주석 보강
 */

import "server-only";
import db from "@/lib/db";
import type { StreamVisibility } from "@/features/stream/types";

// 내부 DTO (페이지에서 사용)
export type StreamDetailDTO = {
  title: string;
  stream_id: string; // CF UID
  userId: number;
  user: {
    id: number;
    username: string;
    avatar?: string | null;
  };
  category?: {
    kor_name: string;
    icon?: string | null;
  } | null;
  tags?: { name: string }[] | null;
  started_at?: Date | null;
  description?: string | null;
  status: string;
  visibility: StreamVisibility;
};

/**
 * 방송(Broadcast) 상세 조회
 * 화면 표시에 필요한 최소한의 필드만 조회합니다.
 *
 * @param {number} id - 방송 ID
 */
export const getBroadcastDetail = async (
  id: number
): Promise<StreamDetailDTO | null> => {
  try {
    const b = await db.broadcast.findUnique({
      where: { id },
      select: {
        title: true,
        description: true,
        started_at: true,
        status: true,
        visibility: true,
        liveInput: {
          select: {
            userId: true,
            provider_uid: true,
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
        category: { select: { kor_name: true, icon: true } },
        tags: { select: { name: true } },
      },
    });

    if (!b || !b.liveInput) return null;

    return {
      title: b.title,
      stream_id: b.liveInput.provider_uid,
      userId: b.liveInput.userId,
      user: {
        id: b.liveInput.user.id,
        username: b.liveInput.user.username,
        avatar: b.liveInput.user.avatar,
      },
      category: b.category
        ? { kor_name: b.category.kor_name, icon: b.category.icon }
        : null,
      tags: b.tags ?? [],
      started_at: b.started_at ?? null,
      description: b.description ?? null,
      status: b.status,
      visibility: b.visibility,
    };
  } catch (error) {
    console.error("[getBroadcastDetail] failed:", error);
    return null;
  }
};

export type VodDetailDTO = {
  vodId: number;
  uid: string;
  durationSec: number | null;
  readyAt: Date | null;
  createdAt: Date;
  views: number;
  counts: { likes: number; comments: number };
  broadcast: {
    id: number;
    title: string;
    visibility: StreamVisibility;
    stream_id: string;
    owner: { id: number; username: string; avatar: string | null };
    category: {
      id: number;
      eng_name: string;
      kor_name: string;
      icon: string | null;
    } | null;
    tags: { id: number; name: string }[];
  };
};

/**
 * 녹화본(VOD) 상세 조회
 * VOD 정보와 원본 방송 정보를 함께 조회합니다.
 *
 * @param {number} vodId - VOD ID
 */
export async function getVodDetail(
  vodId: number
): Promise<VodDetailDTO | null> {
  const vod = await db.vodAsset.findUnique({
    where: { id: vodId },
    select: {
      id: true,
      provider_asset_id: true,
      duration_sec: true,
      ready_at: true,
      created_at: true,
      views: true,
      _count: { select: { recordingLikes: true, recordingComments: true } },
      broadcast: {
        select: {
          id: true,
          title: true,
          visibility: true,
          liveInput: {
            select: {
              provider_uid: true,
              user: { select: { id: true, username: true, avatar: true } },
            },
          },
          category: {
            select: { id: true, eng_name: true, kor_name: true, icon: true },
          },
          tags: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!vod?.broadcast?.liveInput?.provider_uid) return null;

  return {
    vodId: vod.id,
    uid: vod.provider_asset_id,
    durationSec: vod.duration_sec,
    readyAt: vod.ready_at,
    createdAt: vod.created_at,
    views: vod.views ?? 0,
    counts: {
      likes: vod._count.recordingLikes ?? 0,
      comments: vod._count.recordingComments ?? 0,
    },
    broadcast: {
      id: vod.broadcast.id,
      title: vod.broadcast.title,
      visibility: vod.broadcast.visibility,
      stream_id: vod.broadcast.liveInput.provider_uid,
      owner: {
        id: vod.broadcast.liveInput.user.id,
        username: vod.broadcast.liveInput.user.username,
        avatar: vod.broadcast.liveInput.user.avatar,
      },
      category: vod.broadcast.category ?? null,
      tags: (vod.broadcast.tags ?? []).map((t) => ({ id: t.id, name: t.name })),
    },
  };
}
