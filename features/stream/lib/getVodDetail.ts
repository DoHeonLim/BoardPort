/**
 * File Name : features/stream/lib/getVodDetail.ts
 * Description : VodAsset + 부모 Broadcast 메타 조회 (녹화본 상세 페이지 전용 DTO)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.09.22  임도헌   Created   녹화본 상세 페이지에서 사용하는 최소 필드만 선별
 * 2025.11.26  임도헌   Modified  방송 카테고리/태그 포함하도록 DTO 확장(Topbar/메타용)
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 */

import "server-only";
import db from "@/lib/db";
import type { StreamVisibility } from "@/types/stream";

export type VodDetailDTO = {
  vodId: number;
  uid: string; // VodAsset.provider_asset_id
  durationSec: number | null;
  readyAt: Date | null;
  createdAt: Date;
  views: number;
  counts: {
    likes: number;
    comments: number;
  };
  broadcast: {
    id: number;
    title: string;
    visibility: StreamVisibility;
    stream_id: string; // Broadcast.liveInput.provider_uid
    owner: {
      id: number;
      username: string;
      avatar: string | null;
    };
    category: {
      id: number;
      eng_name: string;
      kor_name: string;
      icon: string | null;
    } | null;
    tags: {
      id: number;
      name: string;
    }[];
  };
};

/** vodId 기준으로 상세 메타 조회 */
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
            select: {
              id: true,
              eng_name: true,
              kor_name: true,
              icon: true,
            },
          },
          tags: {
            select: {
              id: true,
              name: true,
            },
          },
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
      category: vod.broadcast.category
        ? {
            id: vod.broadcast.category.id,
            eng_name: vod.broadcast.category.eng_name,
            kor_name: vod.broadcast.category.kor_name,
            icon: vod.broadcast.category.icon ?? null,
          }
        : null,
      tags: (vod.broadcast.tags ?? []).map((t) => ({
        id: t.id,
        name: t.name,
      })),
    },
  };
}
