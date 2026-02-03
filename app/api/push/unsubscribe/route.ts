/**
 * File Name : app/api/push/unsubscribe/route.ts
 * Description : 푸시 알림 구독 해제 API (global OFF)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.22  임도헌   Created
 * 2024.12.22  임도헌   Modified  푸시 알림 구독 해제 API 추가
 * 2025.12.21  임도헌   Modified  pushEnabled=false + 모든 구독 isActive=false (전역 OFF)
 * 2026.01.04  임도헌   Modified  Prisma Route Handler runtime=nodejs 명시
 * 2026.01.23  임도헌   Modified  Service(unsubscribeAll) 호출로 변경
 */

import { NextResponse } from "next/server";
import getSession from "@/lib/session";
import { unsubscribeAll } from "@/features/notification/service/subscription";

export const runtime = "nodejs";

/**
 * POST /api/push/unsubscribe
 *
 * - 사용자의 전역 푸시 설정(pushEnabled)을 끄고, 모든 기기의 구독 상태를 비활성화합니다.
 * - 로그아웃이나 설정 페이지에서 '알림 끄기' 시 호출됩니다.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Service 호출: 모든 기기 구독 비활성화 (isActive=false)
    await unsubscribeAll(session.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push unsubscription error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
