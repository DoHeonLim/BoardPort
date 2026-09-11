/**
 * File Name : app/api/posts/route.ts
 * Description : 게시글 목록 클라이언트 조회 API
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.19  임도헌   Created   Client queryFn에서 조회용 Server Action을 직접 호출하지 않도록 게시글 목록 조회 API 분리
 * 2026.09.08  임도헌   Modified  프로필 작성자별 게시글 조회 파라미터 추가
 * 2026.09.08  임도헌   Modified  허용된 게시글 정렬 query 파싱 추가
 */

import { NextRequest, NextResponse } from "next/server";
import getSession from "@/lib/session";
import { getPostsList } from "@/features/post/service/post";
import type { PostSearchParams } from "@/features/post/types";
import { normalizePostSort } from "@/features/post/utils/postSort";

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
 * 게시글 목록 검색 조건 파싱
 *
 * @param searchParams - 요청 URL query
 * @returns 게시글 목록 service에 전달할 검색 조건
 */
function parsePostSearchParams(
  searchParams: URLSearchParams
): PostSearchParams {
  const authorId = parseNullableNumberParam(searchParams.get("authorId"));
  return {
    keyword: searchParams.get("keyword") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    sort: normalizePostSort(searchParams.get("sort")),
    authorId:
      authorId && Number.isSafeInteger(authorId) && authorId > 0
        ? authorId
        : undefined,
  };
}

/**
 * 게시글 목록 페이지 반환
 * Client Component queryFn은 이 Route Handler를 fetch해 Server Action 초기 렌더 호출 오류를 피하도록 구성
 *
 * @param request - cursor와 검색 조건을 포함한 요청
 * @returns 게시글 목록, 다음 커서, 전체 개수 응답
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  const viewerId = session?.id ?? -1;
  const searchParams = request.nextUrl.searchParams;
  const cursor = parseNullableNumberParam(searchParams.get("cursor"));
  const params = parsePostSearchParams(searchParams);

  const page = await getPostsList(params, viewerId, cursor);
  return NextResponse.json(page);
}
