/**
 * File Name : features/stream/lib/unlockPrivateBroadcast.ts
 * Description : PRIVATE 방송 비밀번호 해제(검증 → 세션 저장) 서버 액션
 * Author : 임도헌
 *
 * History
 * 2025.08.10  임도헌   Created   unlockPrivateStream
 * 2025.08.14  임도헌   Modified  iron-session에 stream_id 저장
 * 2025.08.21  임도헌   Modified  반환 타입을 { success, error? }로 통일
 * 2025.08.26  임도헌   Modified  errorCode 표준화 + 헬퍼 유지
 * 2025.08.30  임도헌   Modified  반환 타입을 유니온으로 변경({ success } | { success:false; error })
 * 2025.09.10  임도헌   Modified  이미 언락된 세션 빠른 종료, streamId 가드/상수 키/예외 방어 추가
 * 2025.09.16  임도헌   Modified  Broadcast 스키마 반영, 세션 키 리네이밍, 파일명 변경
 * 2025.09.17  임도헌   Modified  INTERNAL_ERROR로 서버 예외 구분, 로그 태그 정정
 * 2026.01.03  임도헌   Modified  isBroadcastUnlockedFromSession 도입(세션 중복 조회 제거)
 * 2026.01.03  임도헌   Modified  PRIVATE 비밀번호가 bcrypt 해시로 저장됨(createBroadcast) → compare로 검증하도록 수정
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 */

"use server";

import { compare } from "bcrypt";
import db from "@/lib/db";
import getSession from "@/lib/session";
import type { UnlockResult } from "@/types/stream";

type UnlockSet = Record<string, true>;
const UNLOCK_SESSION_KEY = "unlockedBroadcastIds";

function getUnlockSet(session: any): UnlockSet {
  return (session?.[UNLOCK_SESSION_KEY] ?? {}) as UnlockSet;
}

/**
 * PRIVATE 방송 해제(비밀번호 검증 → 세션 저장)
 * - createBroadcast에서 PRIVATE 비밀번호는 bcrypt 해시로 저장되므로(compare 사용) 평문 비교를 하면 항상 실패한다.
 */
export async function unlockPrivateBroadcast(
  broadcastId: number,
  password: string
): Promise<UnlockResult> {
  try {
    if (!Number.isFinite(broadcastId) || broadcastId <= 0) {
      return { success: false, error: "BAD_REQUEST" };
    }

    const pwd = (password ?? "").trim();
    if (!pwd) return { success: false, error: "MISSING_PASSWORD" };

    const session = await getSession();
    if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" };

    const unlocked = getUnlockSet(session);
    if (unlocked[String(broadcastId)]) {
      return { success: true };
    }

    const info = await db.broadcast.findUnique({
      where: { id: broadcastId },
      select: { id: true, password: true, visibility: true },
    });

    if (!info) return { success: false, error: "STREAM_NOT_FOUND" };
    if (info.visibility !== "PRIVATE")
      return { success: false, error: "NOT_PRIVATE_STREAM" };
    if (!info.password) return { success: false, error: "NO_PASSWORD_SET" };

    // bcrypt 해시 검증
    const ok = await compare(pwd, info.password);
    if (!ok) return { success: false, error: "INVALID_PASSWORD" };

    const nextSet: UnlockSet = { ...unlocked, [String(broadcastId)]: true };
    (session as any)[UNLOCK_SESSION_KEY] = nextSet;
    await session.save();

    return { success: true };
  } catch (e) {
    console.error("[unlockPrivateBroadcast] error:", e);
    return { success: false, error: "INTERNAL_ERROR" };
  }
}
