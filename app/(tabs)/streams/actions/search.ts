/**
 * File Name : app/(tabs)/streams/actions/search
 * Description : 스트리밍 검색 액션 (URL 검색 파라미터 기반)
 * Author : 임도헌
 *
 * History
 * 2025.08.25  임도헌   Created   streams 검색 액션 분리
 * 2025.09.02  임도팀   Modified  TAKE 상수 STREAMS_PAGE_TAKE로 변경
 * 2025.09.10  임도헌   Modified  TAKE+1 페이지네이션/입력 정규화 적용
 * 2026.01.03  임도헌   Modified  getStreams 팔로우 상태 조인 옵션화(includeViewerFollowState) 반영
 * 2026.01.08  임도헌   Modified  리스트에서 잠금 UI 표시를 위해 includeViewerFollowState: true로 변경
 */

"use server";

import { STREAMS_PAGE_TAKE } from "@/lib/constants";
import { getStreams } from "@/features/stream/lib/getStreams";
import type { BroadcastSummary } from "@/types/stream";

export type StreamsSearchResult = {
  streams: BroadcastSummary[];
  nextCursor: number | null;
};

type Scope = "all" | "following";
const TAKE = STREAMS_PAGE_TAKE;

function norm(v?: string) {
  const t = v?.trim();
  return t ? t : undefined;
}

export async function searchStreams(params: {
  scope: Scope;
  category?: string;
  keyword?: string;
  viewerId: number | null;
}): Promise<StreamsSearchResult> {
  const list = await getStreams({
    scope: params.scope,
    keyword: norm(params.keyword),
    category: norm(params.category),
    viewerId: params.viewerId,
    cursor: null,
    take: TAKE + 1,
    includeViewerFollowState: true,
  });

  const hasMore = list.length > TAKE;
  const streams = hasMore ? list.slice(0, TAKE) : list;
  const nextCursor = hasMore ? streams[streams.length - 1].id : null;

  return { streams, nextCursor };
}
