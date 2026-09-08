/** 무효 세션의 쿠키 삭제와 로그인 복귀를 담당하는 쓰기 경계 */
import { NextRequest, NextResponse } from "next/server";
import getSession from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  // 이전 페이지의 redirect가 늦게 도착해도 새로 로그인한 세션은 보존
  if (!session.id) session.destroy();
  const response = NextResponse.redirect(
    new URL(session.id ? "/products" : "/login", request.url)
  );
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
