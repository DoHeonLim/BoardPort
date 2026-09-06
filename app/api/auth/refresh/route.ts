/**
 * File Name : app/api/auth/refresh/route.ts
 * Description : 세션 정보(Role, Ban 상태)를 DB 최신 값으로 갱신하는 API
 * Author : 임도헌
 *
 * History
 * 2026.02.09  임도헌   Created   실시간 정지/권한 변경 시 클라이언트에서 호출하여 쿠키 동기화
 * 2026.03.18  임도헌   Modified  세션이 null인 경우에도 401을 안전하게 반환하도록 optional chaining 보강
 * 2026.09.04  임도헌   Modified  놓친 정지 이벤트를 복구할 수 있도록 최신 정지 상태 응답 추가
 */

import { NextResponse } from "next/server";
import getSession from "@/lib/session";
import db from "@/lib/db";

/** 세션 상태 응답의 브라우저·중간 캐시 저장 방지 */
function noStoreJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST() {
  const session = await getSession();

  if (!session?.id) {
    return noStoreJson({ ok: false, error: "Not logged in" }, 401);
  }

  // DB에서 최신 상태 조회
  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { role: true, bannedAt: true, bannedUntil: true },
  });

  if (!user) {
    session.destroy();
    return noStoreJson({ ok: false, error: "User not found" }, 401);
  }

  const now = new Date();
  const isActivelyBanned =
    !!user.bannedAt && (!user.bannedUntil || user.bannedUntil > now);

  // DB 최신 권한과 현재 유효한 정지 상태를 세션 쿠키에 반영
  session.role = user.role;
  session.banned = isActivelyBanned;
  await session.save();

  return noStoreJson({
    ok: true,
    banned: isActivelyBanned,
    bannedUntil:
      isActivelyBanned && user.bannedUntil
        ? user.bannedUntil.toISOString()
        : null,
  });
}
