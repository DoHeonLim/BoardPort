/**
 * File Name : app/api/cron/check-badges/route.ts
 * Description : 활동 기반 뱃지(항구 축제/보드게임 탐험가) 주기적 점검 (Rolling Batch)
 * Author : 임도헌
 *
 * History
 * 2025.12.03  임도헌   Created   Vercel Cron용 뱃지 점검 엔드포인트
 * 2025.12.06  임도헌   Modified  chunk처리 추가
 * 2026.01.04  임도헌   Modified  Prisma Route Handler runtime=nodejs 명시
 * 2026.01.08  임도헌   Modified  대량 유저 처리 시 타임아웃 방지를 위해 Rolling Batch(take:50) 전략 적용
 * 2026.01.09  임도헌   Modified  Vercel Hobby 플랜 제한(1일 1회) 대응으로 배지 점검 배치 크기 정책을 재조정
 * 2026.05.19  임도헌   Modified  Vercel Cron 자동 Authorization 헤더와 맞추기 위해 CRON_SECRET 기준으로 변경
 * 2026.08.23  임도헌   Modified  CRON_SECRET 누락 fail-closed와 query secret development 제한
 * 2026.08.26  임도헌   Modified  미처리 moderation outbox와 stream webhook inbox·outbox 재시도를 일일 운영 배치에 포함
 */
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import {
  checkBoardExplorerBadge,
  checkPortFestivalBadge,
} from "@/features/user/service/badge";
import { getCronSecret } from "@/lib/env";
import { processModerationOutboxBatch } from "@/features/report/service/moderationOutbox";
import { processStreamWebhookOutboxBatch } from "@/features/stream/service/webhookOutbox";
import { processCloudflareWebhookInboxBatch } from "@/features/stream/service/webhookProcessor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hobby 플랜의 실행 빈도(1일 1회)와 타임아웃(10초)을 고려한 배치 사이즈
const BATCH_SIZE = 30;
// 재검사 최소 간격 (12시간) - 한 번 체크한 유저는 12시간 동안 다시 체크하지 않음
const RECHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;

/**
 * GET /api/cron/check-badges
 * - Vercel Cron에 의해 주기적으로 실행
 * - 신고 처리와 Stream 웹훅 직후 완료되지 않은 inbox·outbox 작업을 먼저 재시도
 * - 타임아웃 방지를 위해 'Rolling Batch' 전략을 사용하여 일정 수의 유저만 처리
 */
export async function GET(req: NextRequest) {
  // 1. 보안 체크: Vercel Cron은 CRON_SECRET 값을 Authorization: Bearer 헤더로 전달
  let cronSecret: string;
  try {
    cronSecret = getCronSecret();
  } catch (error) {
    console.error("[cron/check-badges] invalid server environment:", error);
    return new NextResponse("Service Unavailable", { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");
  const isValidHeader = authHeader === `Bearer ${cronSecret}`;
  const isValidDevelopmentQuery =
    process.env.NODE_ENV === "development" && querySecret === cronSecret;

  if (!isValidHeader && !isValidDevelopmentQuery) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // 신고·Stream 처리 중 실패하거나 중단된 inbox·outbox 작업을 순서대로 복구한다.
  const moderationOutbox = await processModerationOutboxBatch(30).catch(
    (error) => {
      console.error("[cron/check-badges] moderation outbox failed:", error);
      return { claimed: 0, completed: 0, failed: 1 };
    }
  );
  const streamWebhookInbox = await processCloudflareWebhookInboxBatch(10).catch(
    (error) => {
      console.error("[cron/check-badges] stream webhook inbox failed:", error);
      return { claimed: 0, completed: 0, failed: 1 };
    }
  );
  const streamWebhookOutbox = await processStreamWebhookOutboxBatch(10).catch(
    (error) => {
      console.error("[cron/check-badges] stream webhook outbox failed:", error);
      return { claimed: 0, completed: 0, failed: 1 };
    }
  );

  const now = new Date();
  const recheckThreshold = new Date(now.getTime() - RECHECK_INTERVAL_MS);

  // 2. 대상 유저 조회 (Rolling Batch)
  // - 아직 한 번도 체크 안 한 유저 (null)
  // - 또는 마지막 체크로부터 12시간이 지난 유저
  // - 가장 오래된 순서(asc)로 BATCH_SIZE 만큼만 가져옴 (Queue 역할)
  const targetUsers = await db.user.findMany({
    where: {
      OR: [
        { last_badge_check: null },
        { last_badge_check: { lt: recheckThreshold } },
      ],
    },
    orderBy: { last_badge_check: "asc" },
    take: BATCH_SIZE,
    select: { id: true },
  });

  if (targetUsers.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No users to check at this time",
      moderationOutbox,
      streamWebhookInbox,
      streamWebhookOutbox,
    });
  }

  // 3. 뱃지 체크 병렬 실행
  // - Promise.allSettled를 사용하여 일부 실패하더라도 전체 프로세스가 멈추지 않도록 함
  const results = await Promise.allSettled(
    targetUsers.map(async (user) => {
      await checkPortFestivalBadge(user.id);
      await checkBoardExplorerBadge(user.id);
    })
  );

  // 4. 처리된 유저들의 last_badge_check 갱신
  // - 뱃지 획득 여부와 관계없이 시간을 갱신하여 다음 배포에서 제외되도록 함
  const processedIds = targetUsers.map((u) => u.id);
  await db.user.updateMany({
    where: { id: { in: processedIds } },
    data: { last_badge_check: now },
  });

  const successCount = results.filter((r) => r.status === "fulfilled").length;

  return NextResponse.json({
    ok: true,
    processed: processedIds.length,
    success: successCount,
    nextBatchAvailable: processedIds.length === BATCH_SIZE, // 꽉 채워 처리했으면 대기열이 더 있을 수 있음
    moderationOutbox,
    streamWebhookInbox,
    streamWebhookOutbox,
  });
}
