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
 * 2026.02.13  임도헌   Modified  getCachedBroadcastDetail 캐시 함수 export (Metadata용)
 * 2026.03.04  임도헌   Modified  unstable_cache 래퍼 제거 및 단일 함수(getBroadcastDetail)로 통일
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

import "server-only";
import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
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
 * 방송(Broadcast) 상세 정보 조회 로직
 *
 * [데이터 가공 전략]
 * - 화면 표시에 필요한 최소한의 필드(제목, 카테고리, 태그, 시간 등)만 선택적 조회
 * - 방송 소유자의 정보 및 CF Live Input UID 연동 데이터 조인 반환
 *
 * @param {number} id - 방송 ID
 */
export async function getBroadcastDetail(
  id: number
): Promise<StreamDetailDTO | null> {
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
}

/**
 * 방송 상세 정보 캐시 Wrapper 로직
 *
 * [캐시 제어 전략]
 * - `unstable_cache`를 활용하여 방송 상세 데이터의 서버 사이드 렌더링 캐시 적용
 * - `BROADCAST_DETAIL(id)` 태그를 주입하여 상태 변경(Connected/Ended) 시 주문형 무효화 지원
 *
 * @param {number} id - 방송 ID
 */
export const getCachedBroadcastDetail = (id: number) => {
  return nextCache(
    () => getBroadcastDetail(id),
    ["broadcast-detail-data", String(id)],
    { tags: [T.BROADCAST_DETAIL(id)], revalidate: 3600 }
  )();
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
 * 녹화본(VOD) 상세 정보 조회 로직
 *
 * [데이터 가공 전략]
 * - 특정 VodAsset 정보를 기준으로 부모 방송(Broadcast)의 메타데이터(스트리머, 카테고리 등) 일괄 조회
 * - 조회수, 좋아요, 댓글 등의 집계 데이터(Counts) 병합 반환
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
