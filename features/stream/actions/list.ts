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
 */

"use server";

import { STREAMS_PAGE_TAKE } from "@/lib/constants";
import { getStreams } from "@/features/stream/service/list";
import type { BroadcastSummary } from "@/features/stream/types";

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
 * 스트리밍 목록 추가 로드 Action (무한 스크롤)
 *
 * - 클라이언트 컴포넌트(`StreamList`)에서 스크롤 끝 도달 시 호출됩니다.
 * - 검색어, 카테고리, 스코프(전체/팔로잉) 필터를 적용하여 다음 페이지 데이터를 조회합니다.
 *
 * @param {Scope} scope - 조회 범위 ("all" | "following")
 * @param {number | null} cursor - 마지막 아이템 ID
 * @param {Record<string, string>} searchParams - 검색 조건 (category, keyword)
 * @param {number | null} viewerId - 조회자 ID (팔로잉 목록 조회 시 필요)
 * @returns {Promise<StreamsPage>} 다음 페이지 데이터 및 커서
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
    take: TAKE + 1, // 다음 페이지 존재 확인용 +1
    // * 리스트에서 팔로우 전용 방송의 잠금 상태(lock UI)를 표시하기 위해 팔로우 여부 조인이 필요함 (Service 내부 로직 참조)
  });

  const hasMore = list.length > TAKE;
  const trimmed = hasMore ? list.slice(0, TAKE) : list;
  const nextCursor = hasMore ? trimmed[trimmed.length - 1].id : null;

  return { streams: trimmed, nextCursor };
}
