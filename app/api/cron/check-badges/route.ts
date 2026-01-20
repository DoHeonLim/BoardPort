/**
 * File Name : app/api/cron/check-badges/route
 * Description : 활동 기반 뱃지(항구 축제/보드게임 탐험가) 주기적 점검 (Rolling Batch)
 * Author : 임도헌
 *
 * History
 * 2025.12.03  임도헌   Created   Vercel Cron용 뱃지 점검 엔드포인트
 * 2025.12.06  임도헌   Modified  chunk처리 추가
 * 2026.01.04  임도헌   Modified  Prisma Route Handler runtime=nodejs 명시
 * 2026.01.08  임도헌   Modified  대량 유저 처리 시 타임아웃 방지를 위해 Rolling Batch(take:50) 전략 적용
 * 2026.01.09  임도헌   Modified  Vercel Hobby 플랜 제한(1일 1회) 대응: BATCH_SIZE 50 -> 100 상향
 */

import "server-only";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import {
  checkPortFestivalBadge,
  checkBoardExplorerBadge,
} from "@/features/user/lib/badges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // Cron은 항상 동적 실행

/**
 * [변경 이유: 타임아웃 방지 및 확장성 확보]
 * 기존 로직은 "활동이 있는 모든 유저"를 한 번에 조회하여 루프를 돌았습니다.
 * 유저 수가 수천 명 단위로 늘어나면 Vercel Serverless Function의 실행 시간 제한(10초~60초)을
 * 초과하여 작업이 강제 종료될 위험이 있습니다.
 *
 * 따라서 한 번 실행 시 정해진 수(BATCH_SIZE)만큼만 처리하고 종료하는
 * "Rolling Batch" 전략으로 변경합니다.
 */
/**
 * [변경 이유: Vercel Hobby 플랜 제약 대응]
 * Hobby 플랜은 Cron Job을 "하루 1회"만 실행할 수 있습니다.
 * 실행 빈도가 줄어든 만큼, 한 번에 처리하는 유저 수를 늘려야 전체 순환이 원활합니다.
 *
 * 단, Hobby 플랜의 Serverless Function Timeout은 10초(기본)이므로,
 * 너무 크게 늘리면 타임아웃이 발생할 수 있어 100명으로 설정합니다.
 */
const BATCH_SIZE = 100;

/**
 * 재검사 최소 간격 (12시간)
 * 크론 스케줄이 10분마다 돌더라도, 한 번 체크한 유저는 최소 12시간 동안은
 * 다시 체크하지 않도록 하여 불필요한 DB 부하를 줄입니다.
 */
const RECHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  // 보안 체크: Vercel Cron 인증
  const cronSecret = process.env.CRON_SECRET_CHECK_BADGE;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    // Vercel Cron은 헤더로 인증 정보를 보냄 (Bearer {secret})
    // 로컬 테스트 등을 위해 쿼리 파라미터도 허용
    const querySecret = req.nextUrl.searchParams.get("secret");

    const isValidHeader = authHeader === `Bearer ${cronSecret}`;
    const isValidQuery = querySecret === cronSecret;

    if (!isValidHeader && !isValidQuery) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const now = new Date();
  const recheckThreshold = new Date(now.getTime() - RECHECK_INTERVAL_MS);

  // 1. 대상 유저 조회 (Rolling Batch)
  // - 아직 한 번도 체크 안 한 유저 (last_badge_check: null)
  // - 또는 마지막 체크로부터 12시간이 지난 유저
  // - 가장 오래된 순서(asc)로 BATCH_SIZE 만큼만 가져옴
  const targetUsers = await db.user.findMany({
    where: {
      OR: [
        { last_badge_check: null },
        { last_badge_check: { lt: recheckThreshold } },
      ],
    },
    orderBy: { last_badge_check: "asc" }, // 오래된 유저부터 처리 (Queue 방식)
    take: BATCH_SIZE,
    select: { id: true },
  });

  if (targetUsers.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No users to check at this time",
    });
  }

  // 2. 뱃지 체크 병렬 실행
  // - allSettled를 사용하여 일부 실패하더라도 전체 프로세스가 멈추지 않도록 함
  const results = await Promise.allSettled(
    targetUsers.map(async (user) => {
      await checkPortFestivalBadge(user.id);
      await checkBoardExplorerBadge(user.id);
    })
  );

  // 3. 처리된 유저들의 last_badge_check 갱신
  // - 뱃지 획득 성공/실패 여부와 관계없이 '체크 시도' 시간을 갱신하여
  //   다음 크론 실행 시 이 유저들이 다시 선택되지 않도록 함 (Queue 회전)
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
  });
}
