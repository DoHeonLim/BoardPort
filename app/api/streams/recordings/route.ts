/**
 * File Name : app/api/streams/recordings/route.ts
 * Description : 다시보기 목록 클라이언트 조회 API
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.19  임도헌   Created   Client queryFn에서 조회용 Server Action을 직접 호출하지 않도록 다시보기 목록 조회 API 분리
 * 2026.06.25  임도헌   Modified  URL viewerId fallback 제거 및 세션 기준 조회자 권한 고정
 * 2026.08.26  임도헌   Modified  정렬값 기반 불투명 복합 커서 검증 및 응답 적용
 * 2026.09.05  임도헌   Modified  다시보기 추가 페이지에 최초 조회와 동일한 전용 페이지 크기 적용
 */

import { NextRequest, NextResponse } from "next/server";
import { RECORDINGS_PAGE_TAKE } from "@/lib/constants";
import getSession from "@/lib/session";
import { getRecordingsList } from "@/features/stream/service/list";
import type { RecordingSort } from "@/features/stream/types";
import {
  decodeRecordingCursor,
  encodeRecordingCursor,
} from "@/features/stream/utils/recordingCursor";

const TAKE = RECORDINGS_PAGE_TAKE;

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
 * 다시보기 목록 페이지 반환
 * Client Component queryFn은 이 Route Handler를 fetch해 Server Action 초기 렌더 호출 오류를 피하도록 구성
 *
 * @param request - sort, followingOnly, cursor, category, keyword를 포함한 요청
 * @returns 다시보기 목록과 다음 커서 응답
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  const searchParams = request.nextUrl.searchParams;
  const sort: RecordingSort =
    searchParams.get("sort") === "popular" ? "popular" : "latest";
  const followingOnly = searchParams.get("followingOnly") === "true";
  // /api 경로는 middleware 인증 가드를 타지 않으므로 URL viewerId를 신뢰하지 않고 세션만 조회자 기준으로 사용한다.
  const viewerId = session?.id ?? null;
  const rawCursor = searchParams.get("cursor");
  const cursor = decodeRecordingCursor(rawCursor, sort);

  if (!viewerId) {
    return NextResponse.json({ recordings: [], nextCursor: null });
  }

  if (rawCursor && !cursor) {
    return NextResponse.json(
      { message: "유효하지 않은 다시보기 커서입니다." },
      { status: 400 }
    );
  }

  const list = await getRecordingsList({
    sort,
    followingOnly,
    category: normalizeTextParam(searchParams.get("category")),
    keyword: normalizeTextParam(searchParams.get("keyword")),
    viewerId,
    cursor,
    take: TAKE + 1,
  });
  const hasMore = list.length > TAKE;
  const recordings = hasMore ? list.slice(0, TAKE) : list;
  const nextCursor = hasMore
    ? encodeRecordingCursor(sort, recordings[recordings.length - 1])
    : null;

  return NextResponse.json({ recordings, nextCursor });
}
