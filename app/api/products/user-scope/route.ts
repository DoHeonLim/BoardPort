/**
 * File Name : app/api/products/user-scope/route.ts
 * Description : 유저 제품 목록 클라이언트 조회 API
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.19  임도헌   Created   Client queryFn에서 조회용 Server Action을 직접 호출하지 않도록 프로필/마이페이지 제품 목록 조회 API 분리
 */

import { NextRequest, NextResponse } from "next/server";
import getSession from "@/lib/session";
import { getUserProductsList } from "@/features/product/service/userList";
import type { UserProductsScope } from "@/features/product/types";
import { USER_ERRORS } from "@/features/user/constants";

const USER_PRODUCT_SCOPE_TYPES = [
  "SELLING",
  "RESERVED",
  "SOLD",
  "PURCHASED",
  "LIKED",
] as const;

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
 * 유저 제품 목록 scope 파싱
 *
 * @param searchParams - 요청 URL query
 * @returns 유효한 유저 제품 목록 scope 또는 null
 */
function parseUserProductsScope(
  searchParams: URLSearchParams
): UserProductsScope | null {
  const type = searchParams.get("type");
  const userId = parseNullableNumberParam(searchParams.get("userId"));

  if (
    !type ||
    !USER_PRODUCT_SCOPE_TYPES.includes(
      type as (typeof USER_PRODUCT_SCOPE_TYPES)[number]
    ) ||
    !userId
  ) {
    return null;
  }

  return {
    type: type as UserProductsScope["type"],
    userId,
  } as UserProductsScope;
}

/**
 * 유저 제품 목록 페이지 반환
 * Client Component queryFn은 이 Route Handler를 fetch해 Server Action 초기 렌더 호출 오류를 피하도록 구성
 *
 * @param request - scope, userId, cursor를 포함한 요청
 * @returns 제품 목록, 다음 커서, 전체 개수 응답
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const scope = parseUserProductsScope(searchParams);

  if (!scope) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const session = await getSession();
  const viewerId = session?.id ?? null;
  const isPrivateScope =
    scope.type === "PURCHASED" ||
    scope.type === "LIKED" ||
    scope.type === "RESERVED";

  if (isPrivateScope && viewerId !== scope.userId) {
    return NextResponse.json(
      { error: USER_ERRORS.UNAUTHORIZED },
      { status: 403 }
    );
  }

  const cursor = parseNullableNumberParam(searchParams.get("cursor"));
  const page = await getUserProductsList(scope, cursor);
  return NextResponse.json(page);
}
