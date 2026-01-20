/**
 * File Name : features/stream/lib/getBroadcastDetail.ts
 * Description : 스트리밍(방송) 상세 정보 조회 — 상세/채팅 컴포넌트에서 필요한 필드만 선별
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.30  임도헌   Created   app/streams/[id]/actions에서 코드 분리
 * 2025.09.22  임도헌   Modified  StreamDetail/StreamChatRoom 사용 필드만 엄선, status는 DB 값 그대로 유지
 * 2026.01.19  임도헌   Moved      lib/stream -> features/stream/lib
 */

import "server-only";
import db from "@/lib/db";
import type { StreamVisibility } from "@/types/stream";

/** StreamDetail 컴포넌트가 실제로 요구하는 DTO */
export type StreamDetailDTO = {
  title: string;

  /** Cloudflare LiveInput UID (플레이어 식별자) */
  stream_id: string;

  /** 방송 소유자 판별용 */
  userId: number;
  user: {
    id: number;
    username: string;
    avatar?: string | null;
  };

  /** 카테고리/태그는 화면에서 쓰는 최소 필드만 */
  category?: {
    kor_name: string;
    icon?: string | null;
  } | null;
  tags?: { name: string }[] | null;

  /** 메타 */
  started_at?: Date | null;
  description?: string | null;

  /** 상태는 DB값 그대로 — LiveStatusButton과 호환 위해 */
  status: string; // "DISCONNECTED" | "CONNECTED" | "ENDED" | 기타

  /** 페이지 가드용(비공개/팔로워 제한) — page에서 필요 */
  visibility: StreamVisibility;
};

/** 스트리밍 상세 정보 조회 (id = broadcastId) */
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
            provider_uid: true, // stream_id
            // stream_key 조회하지 않음 (민감정보)
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
        category: {
          select: {
            kor_name: true,
            icon: true,
          },
        },
        tags: {
          select: { name: true },
        },
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
    console.error("[getBroadcastDetail] 방송 상세 조회 실패:", error);
    return null;
  }
};
