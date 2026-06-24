/**
 * File Name : app/api/products/route.ts
 * Description : 제품 목록 클라이언트 조회 API
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.19  임도헌   Created   Client queryFn에서 조회용 Server Action을 직접 호출하지 않도록 제품 목록 조회 API 분리
 */

import { NextRequest, NextResponse } from "next/server";
import getSession from "@/lib/session";
import { getProductsList } from "@/features/product/service/list";
import type { ProductSearchParams } from "@/features/product/types";

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
 * 제품 목록 검색 조건 파싱
 *
 * @param searchParams - 요청 URL query
 * @returns 제품 목록 service에 전달할 검색 조건
 */
function parseProductSearchParams(
  searchParams: URLSearchParams
): ProductSearchParams {
  return {
    keyword: searchParams.get("keyword") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    minPrice: parseNumberParam(searchParams.get("minPrice")),
    maxPrice: parseNumberParam(searchParams.get("maxPrice")),
    game_type: searchParams.get("game_type") ?? undefined,
    condition: searchParams.get("condition") ?? undefined,
  };
}

/**
 * 제품 목록 페이지 반환
 * Client Component queryFn은 이 Route Handler를 fetch해 Server Action 초기 렌더 호출 오류를 피하도록 구성
 *
 * @param request - cursor와 검색 조건을 포함한 요청
 * @returns 제품 목록, 다음 커서, 전체 개수 응답
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  const viewerId = session?.id ?? -1;
  const searchParams = request.nextUrl.searchParams;
  const cursor = parseNumberParam(searchParams.get("cursor")) ?? null;
  const params = parseProductSearchParams(searchParams);

  const page = await getProductsList(params, viewerId, cursor);
  return NextResponse.json(page);
}
