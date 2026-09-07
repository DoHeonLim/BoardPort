/**
 * File Name : app/api/auth/realtime-token/route.ts
 * Description : 로그인 세션 기반 Supabase Realtime private 채널 JWT 발급 API
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   DB 사용자·정지 상태 재검증 후 5분 토큰 발급
 */

import { NextResponse } from "next/server";
import getSession from "@/lib/session";
import db from "@/lib/db";
import { createRealtimeAccessToken } from "@/features/realtime/service/token";

export const dynamic = "force-dynamic";

/** Realtime JWT 응답이 브라우저나 중간 캐시에 저장되지 않도록 반환한다. */
function noStoreJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

/** 현재 로그인 세션과 이용 상태를 검증해 private Realtime 단기 JWT를 발급한다. */
export async function POST() {
  const session = await getSession();
  if (!session.id) {
    return noStoreJson({ ok: false, error: "UNAUTHORIZED" }, 401);
  }

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { id: true, bannedAt: true, bannedUntil: true },
  });
  if (!user) {
    session.destroy();
    return noStoreJson({ ok: false, error: "UNAUTHORIZED" }, 401);
  }

  const now = new Date();
  const isActivelyBanned =
    !!user.bannedAt && (!user.bannedUntil || user.bannedUntil > now);
  if (isActivelyBanned) {
    return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);
  }

  const unlockedBroadcastIds = Object.entries(
    session.unlockedBroadcastIds ?? {}
  )
    .filter(([, unlocked]) => unlocked === true)
    .map(([id]) => Number(id));

  try {
    const access = createRealtimeAccessToken({
      userId: user.id,
      unlockedBroadcastIds,
      now,
    });
    return noStoreJson({
      ok: true,
      token: access.token,
      expiresAt: access.expiresAt,
    });
  } catch (error) {
    console.error(
      "[Realtime Token] Failed to create access token:",
      error instanceof Error ? error.message : "UnknownError"
    );
    return noStoreJson({ ok: false, error: "REALTIME_UNAVAILABLE" }, 503);
  }
}
