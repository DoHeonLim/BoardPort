/**
 * File Name : app/api/auth/refresh/route.ts
 * Description : 세션 정보(Role, Ban 상태)를 DB 최신 값으로 갱신하는 API
 * Author : 임도헌
 *
 * History
 * 2026.02.09  임도헌   Created   실시간 정지/권한 변경 시 클라이언트에서 호출하여 쿠키 동기화
 */

import { NextResponse } from "next/server";
import getSession from "@/lib/session";
import db from "@/lib/db";

export async function POST() {
  const session = await getSession();

  if (!session.id) {
    return NextResponse.json(
      { ok: false, error: "Not logged in" },
      { status: 401 }
    );
  }

  // DB에서 최신 상태 조회
  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { role: true, bannedAt: true, bannedUntil: true },
  });

  if (!user) {
    session.destroy();
    return NextResponse.json({ ok: false, error: "User not found" });
  }

  // 세션 값 갱신
  session.role = user.role;
  session.banned = !!user.bannedAt; // 정지 여부 업데이트

  // 만약 정지가 풀렸다면(기간 만료) banned=false로 보정하는 로직은
  // 로그인/미들웨어 등 다른 곳에서 Lazy Unban을 수행하므로 여기선 단순 매핑만 해도 무방하지만,
  // 정확성을 위해 기간 체크도 포함 가능
  if (user.bannedAt && user.bannedUntil && user.bannedUntil < new Date()) {
    session.banned = false;
  }

  await session.save(); // 쿠키 업데이트

  return NextResponse.json({ ok: true });
}
