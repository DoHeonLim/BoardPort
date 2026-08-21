/**
 * File Name : app/api/auth/push-delivery/route.ts
 * Description : Service Worker Push 표시 직전 계정·기기 소유권 확인 API
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.13  임도헌   Created   로그아웃·계정 전환 뒤 지연 Push 표시 차단
 */

import "server-only";
import { NextResponse } from "next/server";
import getSession from "@/lib/session";
import { authorizePushDelivery } from "@/features/notification/service/subscription";
import { parsePushSubscriptionDTO } from "@/features/notification/utils/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

function getRecipientUserId(value: unknown): number | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (record.version !== 1) return null;

  const recipientUserId = record.recipientUserId;
  return Number.isSafeInteger(recipientUserId) && Number(recipientUserId) > 0
    ? Number(recipientUserId)
    : null;
}

/**
 * provider에 이미 접수된 Push도 현재 로그인 계정과 활성 기기 소유권이
 * 일치할 때만 Service Worker가 표시하도록 승인한다.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json(
        { valid: false },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const body: unknown = await request.json();
    const recipientUserId = getRecipientUserId(body);
    const subscription = parsePushSubscriptionDTO(body);

    if (!recipientUserId || !subscription) {
      return NextResponse.json(
        { valid: false },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const allowed = await authorizePushDelivery(
      session.id,
      recipientUserId,
      subscription
    );

    return NextResponse.json(
      { valid: allowed },
      { status: allowed ? 200 : 403, headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("[push-delivery] authorization failed:", error);
    return NextResponse.json(
      { valid: false },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
