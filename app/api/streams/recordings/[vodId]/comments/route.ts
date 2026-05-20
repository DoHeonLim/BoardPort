/**
 * File Name : app/api/streams/recordings/[vodId]/comments/route.ts
 * Description : 녹화본 댓글 목록 클라이언트 조회 API
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.19  임도헌   Created   Client queryFn에서 조회용 Server Action을 직접 호출하지 않도록 녹화본 댓글 조회 API 분리
 */

import { NextRequest, NextResponse } from "next/server";
import getSession from "@/lib/session";
import { getRecordingCommentsList } from "@/features/stream/service/comment";

interface RouteParams {
  params: {
    vodId: string;
  };
}

/**
 * URL query 숫자 파라미터 정규화
 *
 * @param value - URLSearchParams에서 읽은 문자열 값
 * @returns 유효한 숫자 또는 undefined
 */
function parseNumberParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * 녹화본 댓글 목록 페이지 반환
 * Client Component queryFn은 이 Route Handler를 fetch해 Server Action 초기 렌더 호출 오류를 피하도록 구성
 *
 * @param request - cursor와 limit을 포함한 요청
 * @param context - VOD ID route params
 * @returns 녹화본 댓글 목록과 다음 커서 응답
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const vodId = Number(params.vodId);

  if (!Number.isFinite(vodId) || vodId <= 0) {
    return NextResponse.json(
      { comments: [], nextCursor: undefined },
      { status: 400 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const session = await getSession();
  const page = await getRecordingCommentsList(
    vodId,
    parseNumberParam(searchParams.get("cursor")),
    parseNumberParam(searchParams.get("limit")) ?? 10,
    session?.id ?? null
  );

  return NextResponse.json(page);
}
