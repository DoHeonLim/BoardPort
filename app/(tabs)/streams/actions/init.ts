/**
 * File Name : app/(tabs)/streams/actions/init
 * Description : 스트리밍 초기/추가 페이지 로딩 액션
 * Author : 임도헌
 *
 * History
 * 2025.08.25  임도헌   Created   초기/무한스크롤 액션 분리
 * 2025.09.02  임도헌   Modified  TAKE 상수 STREAMS_PAGE_TAKE로 변경
 * 2025.09.10  임도헌   Modified  TAKE+1 페이지네이션(정확한 next 유무 판단) 적용, 주석 보강
 * 2025.09.17  임도헌   Modified  keyword/category 입력 정규화(trim) 적용
 * 2026.01.03  임도헌   Modified  getStreams 팔로우 상태 조인 옵션화(includeViewerFollowState) 반영
 * 2026.01.08  임도헌   Modified  리스트에서 잠금 UI 표시를 위해 includeViewerFollowState: true로 변경
 */

"use server";

import { STREAMS_PAGE_TAKE } from "@/lib/constants";
import { getStreams } from "@/features/stream/lib/getStreams";
import type { BroadcastSummary } from "@/types/stream";

export type StreamsPage = {
  streams: BroadcastSummary[];
  nextCursor: number | null;
};

type Scope = "all" | "following";
const TAKE = STREAMS_PAGE_TAKE;

function norm(v?: string) {
  const t = v?.trim();
  return t ? t : undefined;
}

/**
 * 초기 로드:
 * - TAKE+1로 받아 다음 페이지 존재 여부를 정확히 판별
 * - 넘친 1개는 잘라서 반환
 * 이유 : 마지막 구간의 불필요한 fetch/스피너 제거, UX/부하 모두 개선
 */
export async function getInitialStreams(params: {
  scope: Scope;
  category?: string;
  keyword?: string;
  viewerId: number | null;
}): Promise<StreamsPage> {
  const list = await getStreams({
    scope: params.scope,
    category: norm(params.category),
    keyword: norm(params.keyword),
    viewerId: params.viewerId,
    cursor: null,
    take: TAKE + 1,
    includeViewerFollowState: true, // ✨ 변경됨
  });

  const hasMore = list.length > TAKE;
  const trimmed = hasMore ? list.slice(0, TAKE) : list;
  const nextCursor = hasMore ? trimmed[trimmed.length - 1].id : null;

  return { streams: trimmed, nextCursor };
}

/**
 * 추가 로드:
 * - 동일하게 TAKE+1 전략
 */
export async function getMoreStreams(
  scope: Scope,
  cursor: number | null,
  searchParams: Record<string, string>,
  viewerId: number | null
): Promise<StreamsPage> {
  const list = await getStreams({
    scope,
    category: norm(searchParams.category),
    keyword: norm(searchParams.keyword),
    viewerId,
    cursor,
    take: TAKE + 1,
    includeViewerFollowState: true,
  });

  const hasMore = list.length > TAKE;
  const trimmed = hasMore ? list.slice(0, TAKE) : list;
  const nextCursor = hasMore ? trimmed[trimmed.length - 1].id : null;

  return { streams: trimmed, nextCursor };
}
