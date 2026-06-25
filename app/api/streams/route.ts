/**
 * File Name : app/api/streams/route.ts
 * Description : 라이브 방송 목록 클라이언트 조회 API
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.19  임도헌   Created   Client queryFn에서 조회용 Server Action을 직접 호출하지 않도록 라이브 방송 목록 조회 API 분리
 * 2026.06.25  임도헌   Modified  URL viewerId fallback 제거 및 세션 기준 조회자 권한 고정
 */

import { NextRequest, NextResponse } from "next/server";
import { STREAMS_PAGE_TAKE } from "@/lib/constants";
import getSession from "@/lib/session";
import { getStreamsList } from "@/features/stream/service/list";
import type { StreamScope } from "@/features/stream/types";

const TAKE = STREAMS_PAGE_TAKE;

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
 * 공백 검색 파라미터 정규화
 *
 * @param value - URLSearchParams에서 읽은 문자열 값
 * @returns trim 후 값 또는 undefined
 */
function normalizeTextParam(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * 라이브 방송 목록 페이지 반환
 * Client Component queryFn은 이 Route Handler를 fetch해 Server Action 초기 렌더 호출 오류를 피하도록 구성
 *
 * @param request - scope, cursor, category, keyword를 포함한 요청
 * @returns 방송 목록과 다음 커서 응답
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  const searchParams = request.nextUrl.searchParams;
  const scope: StreamScope =
    searchParams.get("scope") === "following" ? "following" : "all";
  // /api 경로는 middleware 인증 가드를 타지 않으므로 URL viewerId를 신뢰하지 않고 세션만 조회자 기준으로 사용한다.
  const viewerId = session?.id ?? null;

  if (!viewerId) {
    return NextResponse.json({ streams: [], nextCursor: null });
  }

  const list = await getStreamsList({
    scope,
    category: normalizeTextParam(searchParams.get("category")),
    keyword: normalizeTextParam(searchParams.get("keyword")),
    viewerId,
    cursor: parseNullableNumberParam(searchParams.get("cursor")),
    take: TAKE + 1,
  });
  const hasMore = list.length > TAKE;
  const streams = hasMore ? list.slice(0, TAKE) : list;
  const nextCursor = hasMore ? streams[streams.length - 1].id : null;

  return NextResponse.json({ streams, nextCursor });
}
