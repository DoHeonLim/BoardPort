/**
 * File Name : features/stream/actions/list.ts
 * Description : 방송 목록 조회 서버 액션
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
 * 2026.03.29  임도헌   Modified  다시보기 최신/인기 정렬과 팔로잉만 보조 필터 액션 파라미터 정리
 * 2026.03.31  임도헌   Modified  방송/다시보기 목록 액션 역할이 보이도록 설명 톤 통일
 * 2026.05.08  임도헌   Modified  목록 응답 타입과 조회 범위 타입을 features/stream/types.ts로 이동
 * 2026.05.15  임도헌   Modified  유저 채널 다시보기 무한스크롤 액션 추가
 * 2026.05.18  임도헌   Modified  채널 다시보기 추가 페이지에서도 현재 사용자 좋아요 여부를 유지하도록 viewerId 전달
 * 2026.06.25  임도헌   Modified  목록 액션의 조회자 권한 판단을 서버 세션 기준으로 고정
 * 2026.08.21  임도헌   Modified  비로그인·차단 관계 채널 VOD Action에서 signed thumbnail 발급 전 조회 중단
 * 2026.08.26  임도헌   Modified  메인 다시보기 목록에 정렬값 기반 불투명 복합 커서 적용
 * 2026.08.27  임도헌   Modified  손상된 비어 있지 않은 다시보기 커서를 Server Action에서도 거부
 */

"use server";

import { STREAMS_PAGE_TAKE } from "@/lib/constants";
import {
  getChannelVods,
  getRecordingsList,
  getStreamsList,
} from "@/features/stream/service/list";
import { getViewerRole } from "@/features/stream/service/access";
import { isBroadcastUnlockedFromSession } from "@/features/stream/utils/session";
import type {
  RecordingsPage,
  RecordingListCursor,
  RecordingSort,
  StreamsPage,
  StreamScope,
  ViewerRole,
  VodForGrid,
} from "@/features/stream/types";
import {
  decodeRecordingCursor,
  encodeRecordingCursor,
} from "@/features/stream/utils/recordingCursor";
import getSession from "@/lib/session";
import { checkBlockRelation } from "@/features/user/service/block";

const TAKE = STREAMS_PAGE_TAKE;
type Session = Awaited<ReturnType<typeof getSession>>;

/**
 * 입력값 정규화
 * 빈 문자열 검색 파라미터를 undefined로 바꿔 service 조건 분기와 정합성 유지
 */
function norm(v?: string) {
  const t = v?.trim();
  return t ? t : undefined;
}

/**
 * 채널 다시보기 목록 노출과 접근 권한 분리
 * PRIVATE는 세션 언락 여부, FOLLOWERS는 현재 팔로우 역할 기준으로 잠금 플래그 보정
 */
function applyChannelVodAccess(
  vods: VodForGrid[],
  session: Session,
  role: ViewerRole
): VodForGrid[] {
  return vods.map((v) => {
    const isPrivate = v.visibility === "PRIVATE";
    const isFollowers = v.visibility === "FOLLOWERS";
    const unlocked = isPrivate
      ? isBroadcastUnlockedFromSession(session, v.broadcastId)
      : false;

    return {
      ...v,
      requiresPassword: isPrivate && role !== "OWNER" && !unlocked,
      followersOnlyLocked:
        isFollowers && !(role === "OWNER" || role === "FOLLOWER"),
    };
  });
}

/**
 * 스트리밍(방송) 목록 무한 스크롤 조회 Server Action
 *
 * [데이터 페칭 및 권한 로직]
 * - 뷰어(viewerId) 정보를 기반으로 팔로잉 전용 필터 적용 여부 판단
 * - URL 검색 파라미터(카테고리, 키워드) 공백 정규화 처리 후 Service 레이어 전달
 * - 무한 스크롤을 위한 현재 페이지 데이터(streams) 및 다음 커서(nextCursor) 도출
 *
 * @param {StreamScope} scope - 조회 범위 ("all" | "following")
 * @param {number | null} cursor - 이전 페이지의 마지막 방송 ID
 * @param {Record<string, string>} searchParams - 카테고리 및 키워드 필터 조건
 * @returns {Promise<StreamsPage>} 평탄화된 방송 목록과 페이징 커서 반환
 */
export async function getStreamsListAction(
  scope: StreamScope,
  cursor: number | null,
  searchParams: Record<string, string>
): Promise<StreamsPage> {
  const session = await getSession();
  const userId = session?.id ?? null;

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

/**
 * 다시보기 목록 무한 스크롤 조회 Server Action
 *
 * [기능]
 * - 정렬 기준(latest/popular)과 팔로잉 전용 필터를 service 계층에 위임
 * - 카테고리/키워드 검색 파라미터를 공백 정규화 후 전달
 * - 무한 스크롤용 recordings 배열과 다음 커서(nextCursor)를 반환
 * - 조회자 권한 판단은 서버 세션만 신뢰
 *
 * @param sort - 최신순 또는 인기순 정렬
 * @param followingOnly - 팔로잉한 스트리머만 조회할지 여부
 * @param cursor - 이전 페이지에서 발급한 불투명 복합 커서
 * @param searchParams - 카테고리·키워드 필터
 * @returns 다시보기 목록과 다음 페이지 커서
 */
export async function getRecordingsListAction(
  sort: RecordingSort,
  followingOnly: boolean,
  cursor: RecordingListCursor | null,
  searchParams: Record<string, string>
): Promise<RecordingsPage> {
  const session = await getSession();
  const userId = session?.id ?? null;

  if (!userId) return { recordings: [], nextCursor: null };

  const decodedCursor = decodeRecordingCursor(cursor, sort);
  if (cursor && !decodedCursor) {
    throw new Error("유효하지 않은 다시보기 커서입니다.");
  }

  // 다시보기 service는 TAKE + 1 규칙으로 다음 페이지 존재 여부를 판별
  const list = await getRecordingsList({
    sort,
    followingOnly,
    category: norm(searchParams.category),
    keyword: norm(searchParams.keyword),
    viewerId: userId,
    cursor: decodedCursor,
    take: TAKE + 1,
  });

  const hasMore = list.length > TAKE;
  const trimmed = hasMore ? list.slice(0, TAKE) : list;
  const nextCursor = hasMore
    ? encodeRecordingCursor(sort, trimmed[trimmed.length - 1])
    : null;

  return { recordings: trimmed, nextCursor };
}

/**
 * 유저 채널 다시보기 무한 스크롤 조회 Server Action
 *
 * [기능]
 * - 특정 채널 소유자의 VOD를 커서 기반으로 추가 조회
 * - PRIVATE/FOLLOWERS 접근 플래그를 현재 세션 기준으로 보정
 * - 채널 페이지의 첫 SSR 페이지 이후 추가 페이지 로딩에 사용
 */
export async function getChannelVodsAction(
  ownerId: number,
  cursor: number | null
): Promise<RecordingsPage<number>> {
  if (!Number.isFinite(ownerId) || ownerId <= 0) {
    return { recordings: [], nextCursor: null };
  }

  const session = await getSession();
  const viewerId = session?.id ?? null;
  if (!viewerId) return { recordings: [], nextCursor: null };
  if (await checkBlockRelation(viewerId, ownerId)) {
    return { recordings: [], nextCursor: null };
  }

  const role = (await getViewerRole(viewerId, ownerId)) as ViewerRole;
  const list = await getChannelVods(ownerId, TAKE + 1, cursor, viewerId);
  const withAccess = applyChannelVodAccess(list, session, role);

  const hasMore = withAccess.length > TAKE;
  const trimmed = hasMore ? withAccess.slice(0, TAKE) : withAccess;
  const nextCursor = hasMore ? trimmed[trimmed.length - 1].vodId : null;

  return { recordings: trimmed, nextCursor };
}
