/**
 * File Name : app/api/users/[id]/info/route.ts
 * Description : 특정 유저의 최소 프로필 정보(id/username/avatar) 조회 API
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.10.22  임도헌   Created   공개 필드만 반환하는 라이트 엔드포인트 추가(SSR 캐시 영향 없음)
 * 2026.01.04  임도헌   Modified  Prisma Route Handler runtime=nodejs 명시
 */

import { NextResponse } from "next/server";
import db from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: { id: string } };

/**
 * GET /api/users/[id]/info
 *
 * - 특정 유저의 ID, Username, Avatar 정보를 반환합니다.
 * - 세션 인증 없이 공개된 정보만 제공합니다. (Public Profile)
 * - 주로 리스트 등에서 유저 정보를 낙관적으로 표시(Optimistic UI)할 때 사용됩니다.
 */
export async function GET(_req: Request, { params }: Params) {
  const idNum = Number(params.id);

  // ID 유효성 검사
  if (!idNum || Number.isNaN(idNum)) {
    return NextResponse.json(
      { ok: false, error: "Invalid id" },
      { status: 400 }
    );
  }

  // DB 조회 (최소 정보만)
  const user = await db.user.findUnique({
    where: { id: idNum },
    select: { id: true, username: true, avatar: true },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "User not found" },
      { status: 404 }
    );
  }

  // 캐싱 방지 헤더 설정 (프로필 정보는 변경될 수 있으므로)
  return new NextResponse(JSON.stringify({ ok: true, user }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
