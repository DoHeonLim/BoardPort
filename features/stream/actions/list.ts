/**
 * File Name : features/stream/actions/list.ts
 * Description : 방송 목록 조회 Controller
 * Author : 임도헌
 *
 * History
 * 2025.08.25  임도헌   Created   초기/무한스크롤 액션 분리
 * 2025.09.02  임도헌   Modified  TAKE 상수 STREAMS_PAGE_TAKE로 변경
 * 2025.09.10  임도헌   Modified  TAKE+1 페이지네이션(정확한 next 유무 판단) 적용, 주석 보강
 * 2025.09.17  임도헌   Modified  keyword/category 입력 정규화(trim) 적용
 * 2026.01.03  임도헌   Modified  getStreams 팔로우 상태 조인 옵션화(includeViewerFollowState) 반영
 * 2026.01.08  임도헌   Modified  리스트에서 잠금 UI 표시를 위해 includeViewerFollowState: true로 변경
 * 2026.01.23  임도헌   Modified  Service(list.ts) 연동 및 Session 주입
 * 2026.01.23  임도헌   Modified  getInitialStreams 제거(Page에서 Service 직접 호출), getMoreStreams만 유지
 * 2026.01.29  임도헌   Modified  주석 설명 보강
 * 2026.01.30  임도헌   Moved     app/(tabs)/streams/actions/init.ts (getMoreStreams) -> features/stream/actions/list.ts
 * 2026.03.04  임도헌   Modified  getStreamsListAction 명칭 변경 및 getStreamsList 서비스 연동
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

"use server";

import { STREAMS_PAGE_TAKE } from "@/lib/constants";
import { getStreamsList } from "@/features/stream/service/list";
import type { BroadcastSummary } from "@/features/stream/types";
import getSession from "@/lib/session";

export type StreamsPage = {
  streams: BroadcastSummary[];
  nextCursor: number | null;
};

type Scope = "all" | "following";
const TAKE = STREAMS_PAGE_TAKE;

// 입력값 정규화 (빈 문자열 -> undefined)
function norm(v?: string) {
  const t = v?.trim();
  return t ? t : undefined;
}

/**
 * 스트리밍(방송) 목록 무한 스크롤 조회 Server Action
 *
 * [데이터 페칭 및 권한 로직]
 * - 뷰어(viewerId) 정보를 기반으로 팔로잉 전용 필터 적용 여부 판단
 * - URL 검색 파라미터(카테고리, 키워드) 공백 정규화 처리 후 Service 레이어 전달
 * - 무한 스크롤을 위한 현재 페이지 데이터(streams) 및 다음 커서(nextCursor) 도출
 *
 * @param {Scope} scope - 조회 범위 ("all" | "following")
 * @param {number | null} cursor - 이전 페이지의 마지막 방송 ID
 * @param {Record<string, string>} searchParams - 카테고리 및 키워드 필터 조건
 * @param {number | null} viewerId - 조회자 ID (팔로잉 목록 확인용)
 * @returns {Promise<StreamsPage>} 평탄화된 방송 목록과 페이징 커서 반환
 */
export async function getStreamsListAction(
  scope: Scope,
  cursor: number | null,
  searchParams: Record<string, string>,
  viewerId: number | null
): Promise<StreamsPage> {
  const session = await getSession();
  const userId = session?.id ?? viewerId;

  if (!userId) return { streams: [], nextCursor: null };

  const list = await getStreamsList({
    scope,
    category: norm(searchParams.category),
    keyword: norm(searchParams.keyword),
    viewerId: userId,
    cursor,
    take: TAKE + 1,
  });

  const hasMore = list.length > TAKE;
  const trimmed = hasMore ? list.slice(0, TAKE) : list;
  const nextCursor = hasMore ? trimmed[trimmed.length - 1].id : null;

  return { streams: trimmed, nextCursor };
}
