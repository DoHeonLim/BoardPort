/**
 * File Name : features/stream/utils/serializer.ts
 * Description : DB 모델 → 카드용 DTO 직렬화 유틸
 * Author : 임도헌
 *
 * History
 * 2025.08.26  임도헌   Created   StreamCardItem DTO 직렬화 유틸
 * 2025.09.17  임도헌   Modified  startedAt(ISO) 통일, 가드/널 처리 정리
 * 2025.09.23  임도헌   Modified  BroadcastSummary 최신 스펙 반영(stream_id/status/started_at/ended_at, isFollowing 제거)
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 * 2026.01.23  임도헌   Moved     lib/stream/serializeStream -> utils/serializer
 */

import type {
  BroadcastSummary,
  StreamTag,
  StreamVisibility,
} from "@/features/stream/types";

const CONNECTED = "CONNECTED";

// DB 조회 결과(Raw) 타입 정의
type RawRow = {
  id: number;
  stream_id: string; // CF LiveInput UID
  title: string;
  description: string | null;
  thumbnail: string | null;
  visibility: StreamVisibility;
  status: string;
  started_at: Date | null;
  ended_at?: Date | null;
  userId: number;
  user: { id: number; username: string; avatar: string | null };
  category?: {
    id?: number;
    eng_name?: string;
    kor_name: string;
    icon?: string | null;
  } | null;
  tags: StreamTag[];
};

/**
 * 스트림 데이터를 UI에서 사용하기 쉬운 형태(`BroadcastSummary`)로 직렬화합니다.
 *
 * [접근 제어 플래그 계산]
 * 1. `requiresPassword`: PRIVATE 방송이면서 본인이 아닌 경우 true.
 *    (단, 실제 비밀번호 언락 여부는 Session에 있으므로, 이 플래그는 "비밀번호가 필요한 상태임"을 나타냄)
 * 2. `followersOnlyLocked`: FOLLOWERS 방송이면서 본인도 아니고 팔로워도 아닌 경우 true.
 *
 * @param s - DB 원시 데이터 Row
 * @param opts - 현재 뷰어의 상태 (isFollowing, isMine)
 */
export function serializeStream(
  s: RawRow,
  opts: { isFollowing: boolean; isMine: boolean }
): BroadcastSummary {
  // PRIVATE 잠금: 본인이 아니면 잠금 (비밀번호 언락 여부는 별도 세션 체크 필요)
  const requiresPassword = s.visibility === "PRIVATE" ? !opts.isMine : false;

  // FOLLOWERS 잠금: 본인도 아니고 팔로워도 아니면 잠금
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
      : null,
    tags: Array.isArray(s.tags) ? s.tags.map((t) => ({ name: t.name })) : [],
    followersOnlyLocked,
    requiresPassword,
  };
}
