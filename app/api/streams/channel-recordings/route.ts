/**
 * File Name : app/api/streams/channel-recordings/route.ts
 * Description : 유저 채널 다시보기 클라이언트 조회 API
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.19  임도헌   Created   Client queryFn에서 조회용 Server Action을 직접 호출하지 않도록 채널 다시보기 추가 페이지 조회 API 분리
 */

import { NextRequest, NextResponse } from "next/server";
import { STREAMS_PAGE_TAKE } from "@/lib/constants";
import getSession from "@/lib/session";
import { getViewerRole } from "@/features/stream/service/access";
import { getChannelVods } from "@/features/stream/service/list";
import { isBroadcastUnlockedFromSession } from "@/features/stream/utils/session";
import type { ViewerRole, VodForGrid } from "@/features/stream/types";

const TAKE = STREAMS_PAGE_TAKE;
type Session = Awaited<ReturnType<typeof getSession>>;

/**
 * URL query 숫자 파라미터 정규화
 *
 * @param value - URLSearchParams에서 읽은 문자열 값
 * @returns 유효한 숫자 또는 null
 */
function parseNullableNumberParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * 채널 다시보기 접근 플래그 보정
 *
 * @param vods - 채널 VOD 목록
 * @param session - 현재 세션
 * @param role - 조회자의 채널 역할
 * @returns 접근 보조 플래그가 반영된 VOD 목록
 */
function applyChannelVodAccess(
  vods: VodForGrid[],
  session: Session,
  role: ViewerRole
): VodForGrid[] {
  return vods.map((vod) => {
    const isPrivate = vod.visibility === "PRIVATE";
    const isFollowers = vod.visibility === "FOLLOWERS";
    const unlocked = isPrivate
      ? isBroadcastUnlockedFromSession(session, vod.broadcastId)
      : false;

    return {
      ...vod,
      requiresPassword: isPrivate && role !== "OWNER" && !unlocked,
      followersOnlyLocked:
        isFollowers && !(role === "OWNER" || role === "FOLLOWER"),
    };
  });
}

/**
 * 유저 채널 다시보기 목록 페이지 반환
 * Client Component queryFn은 이 Route Handler를 fetch해 Server Action 초기 렌더 호출 오류를 피하도록 구성
 *
 * @param request - ownerId와 cursor를 포함한 요청
 * @returns 채널 다시보기 목록과 다음 커서 응답
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ownerId = parseNullableNumberParam(searchParams.get("ownerId"));

  if (!ownerId || ownerId <= 0) {
    return NextResponse.json({ recordings: [], nextCursor: null });
  }

  const session = await getSession();
  const role = (await getViewerRole(session?.id ?? null, ownerId)) as ViewerRole;
  const list = await getChannelVods(
    ownerId,
    TAKE + 1,
    parseNullableNumberParam(searchParams.get("cursor")),
    session?.id ?? null
  );
  const withAccess = applyChannelVodAccess(list, session, role);
  const hasMore = withAccess.length > TAKE;
  const recordings = hasMore ? withAccess.slice(0, TAKE) : withAccess;
  const nextCursor = hasMore
    ? recordings[recordings.length - 1].vodId
    : null;

  return NextResponse.json({ recordings, nextCursor });
}
