/**
 * File Name : app/api/push/check-subscription/route.ts
 * Description : 푸시 알림 구독 확인 API (전역 토글 + 현재 endpoint 활성 상태 검증)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.31  임도헌   Created
 * 2024.12.31  임도헌   Modified  푸시 알림 구독 확인 API 추가
 * 2025.12.21  임도헌   Modified  isActive=true && pushEnabled!=false 일 때만 유효(true)로 판단
 * 2026.01.04  임도헌   Modified  Prisma Route Handler runtime=nodejs 명시
 * 2026.01.23  임도헌   Modified  Service(checkSubscriptionStatus) 호출로 변경
 */

import { NextResponse } from "next/server";
import getSession from "@/lib/session";
import { checkSubscriptionStatus } from "@/features/notification/service/subscription";

export const runtime = "nodejs";

/**
 * POST /api/push/check-subscription
 *
 * - 클라이언트가 가지고 있는 푸시 엔드포인트가 DB에서도 유효한지(isActive) 확인합니다.
 * - 전역 설정(pushEnabled)이 꺼져있다면 유효하지 않은 것으로 간주합니다.
 * - 앱 초기 로딩 시 브라우저 상태와 서버 상태를 동기화하기 위해 사용됩니다.
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    // 비로그인 상태면 구독 정보가 없는 것으로 간주
    if (!session?.id) return NextResponse.json({ isValid: false });

    const { endpoint } = await req.json();
    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json({ isValid: false }, { status: 400 });
    }

    // Service 호출: 해당 endpoint가 활성 상태인지 검사
    const isValid = await checkSubscriptionStatus(session.id, endpoint);

    return NextResponse.json({ isValid });
  } catch (error) {
    console.error("Check subscription error:", error);
    return NextResponse.json({ isValid: false });
  }
}
