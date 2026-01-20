/**
 * File Name : features/stream/lib/serializeStream.ts
 * Description : DB 모델 → 카드용 DTO 직렬화
 * Author : 임도헌
 *
 * History
 * 2025.08.26  임도헌   Created   StreamCardItem DTO 직렬화 유틸
 * 2025.09.17  임도헌   Modified  startedAt(ISO) 통일, 가드/널 처리 정리
 * 2025.09.23  임도헌   Modified  BroadcastSummary 최신 스펙 반영(stream_id/status/started_at/ended_at, isFollowing 제거)
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 */

import type {
  BroadcastSummary,
  StreamTag,
  StreamVisibility,
} from "@/types/stream";

const CONNECTED = "CONNECTED";

type RawRow = {
  id: number;
  stream_id: string; // CF LiveInput UID (provider_uid)
  title: string;
  description: string | null; // 사용하지 않지만 원본 타입 유지
  thumbnail: string | null;
  visibility: StreamVisibility;
  status: string; // "CONNECTED" | "DISCONNECTED" | "ENDED" | string
  started_at: Date | null;
  ended_at?: Date | null;
  userId: number; // 소유자 판별용(옵션) — 반환에는 쓰지 않음
  user: { id: number; username: string; avatar: string | null };
  category?: {
    id?: number;
    eng_name?: string;
    kor_name: string;
    icon?: string | null;
  } | null;
  tags: StreamTag[];
};

export function serializeStream(
  s: RawRow,
  opts: { isFollowing: boolean; isMine: boolean }
): BroadcastSummary {
  const requiresPassword = s.visibility === "PRIVATE" ? !opts.isMine : false;
  const followersOnlyLocked =
    s.visibility === "FOLLOWERS" ? !opts.isMine && !opts.isFollowing : false;

  return {
    id: s.id,
    stream_id: s.stream_id,
    title: s.title,
    thumbnail: s.thumbnail ?? null,
    isLive: (s.status ?? "").toUpperCase() === CONNECTED,
    status: s.status,
    visibility: s.visibility,
    started_at: s.started_at ?? null,
    ended_at: s.ended_at ?? null,
    user: {
      id: s.user.id,
      username: s.user.username,
      avatar: s.user.avatar ?? null,
    },
    category: s.category
      ? {
          id: s.category.id,
          kor_name: s.category.kor_name,
          icon: s.category.icon ?? null,
        }
      : null, // 존재 안하면 null
    tags: Array.isArray(s.tags) ? s.tags.map((t) => ({ name: t.name })) : [],
    followersOnlyLocked,
    requiresPassword,
  };
}
