/**
 * File Name : app/api/me/route.ts
 * Description : 현재 로그인 유저 최소 정보 조회 API (세션 id 기반 → DB 조회)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.12.12  임도헌   Created   /api/me 엔드포인트 추가
 * 2025.12.12  임도헌   Modified  세션에는 id만 존재 → DB 조회 방식으로 전환, no-store 적용
 * 2026.01.04  임도헌   Modified  Prisma Route Handler runtime=nodejs 명시 + no-store 헤더 상수화
 */

import "server-only";
import { NextResponse } from "next/server";
import getSession from "@/lib/session";
import db from "@/lib/db";

// Prisma 호환성을 위해 Node.js 런타임 강제
export const runtime = "nodejs";

// 클라이언트 부팅 시(알림 등) 잦은 호출 & 개인화 데이터 -> 캐시 금지
export const dynamic = "force-dynamic";
export const revalidate = 0;

// 브라우저 캐싱 방지 헤더
const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

export type MeResponse =
  | {
      ok: true;
      user: {
        id: number;
        username: string;
        avatar: string | null;
        emailVerified: boolean;
      };
    }
  | { ok: false; user: null; error: "UNAUTHORIZED" };

/**
 * GET /api/me
 *
 * - 쿠키 세션에서 userId를 추출합니다.
 * - DB에서 해당 유저의 최신 기본 정보(username, avatar, emailVerified)를 조회합니다.
 * - 로그인되지 않았거나 유저가 존재하지 않으면 401을 반환합니다.
 */
export async function GET() {
  // 1. 세션 확인
  const session = await getSession();
  const userId = session?.id ?? null;

  if (!userId) {
    return NextResponse.json<MeResponse>(
      { ok: false, user: null, error: "UNAUTHORIZED" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  // 2. DB 조회 (세션 데이터는 낡을 수 있으므로 DB가 SSOT)
  const me = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, avatar: true, emailVerified: true },
  });

  // 3. 유저 검증 (탈퇴/차단 등)
  if (!me) {
    return NextResponse.json<MeResponse>(
      { ok: false, user: null, error: "UNAUTHORIZED" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  // 4. 성공 응답
  return NextResponse.json<MeResponse>(
    {
      ok: true,
      user: {
        id: me.id,
        username: me.username,
        avatar: me.avatar ?? null,
        emailVerified: !!me.emailVerified,
      },
    },
    { headers: NO_STORE_HEADERS }
  );
}
