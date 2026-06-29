/**
 * File Name : scripts/cleanup-e2e.ts
 * Description : E2E 회귀 테스트용 콘텐츠/알림 cleanup 스크립트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   E2E prefix 데이터와 테스트 계정 알림 정리 스크립트 추가
 * 2026.05.26  임도헌   Modified  E2E 상품 채팅방 seed cleanup 기준 추가
 * 2026.05.26  임도헌   Modified  E2E 보드게임 도감 seed cleanup 기준 추가
 * 2026.05.26  임도헌   Modified  E2E 방송/VOD seed cleanup 기준 추가
 * 2026.05.26  임도헌   Modified  E2E 신고 처리 seed와 감사 로그 cleanup 기준 추가
 * 2026.06.26  임도헌   Modified  E2E 계정 간 팔로우 관계 cleanup 추가
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const E2E_PREFIX = "[E2E]";
const E2E_USER_EMAILS = [
  "e2e.seller@boardport.test",
  "e2e.buyer@boardport.test",
  "e2e.admin@boardport.test",
];

/**
 * 터미널 직접 실행 시 `.env` 값을 process.env에 주입
 *
 * 이미 터미널에서 지정한 환경 변수는 `.env` 값으로 덮어쓰지 않고 유지
 */
function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const normalized = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length)
      : trimmed;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = normalized.slice(0, separatorIndex).trim();
    const rawValue = normalized.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

/**
 * PrismaPg가 사용할 DB client 생성
 *
 * Prisma Client용 URL 옵션은 PrismaPg 연결 문자열에서 제거
 */
function createDb() {
  loadEnvFile();

  const rawConnectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

  if (!rawConnectionString) {
    throw new Error(
      "DIRECT_URL or DATABASE_URL is required to cleanup E2E data."
    );
  }

  const connectionUrl = new URL(rawConnectionString);
  // PrismaPg가 직접 해석하지 않는 Prisma 전용 옵션은 연결 전 제거
  connectionUrl.searchParams.delete("pgbouncer");
  connectionUrl.searchParams.delete("connection_limit");

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: connectionUrl.toString(),
    }),
  });
}

/**
 * E2E 실행 후 남는 prefix 콘텐츠와 알림만 정리
 *
 * E2E 계정은 매번 삭제하지 않고 재사용해 로그인 seed 안정성 유지
 */
async function cleanupE2EData() {
  const db = createDb();

  try {
    const e2eUsers = await db.user.findMany({
      where: { email: { in: E2E_USER_EMAILS } },
      select: { id: true },
    });
    const e2eUserIds = e2eUsers.map((user) => user.id);

    const followResult = await db.follow.deleteMany({
      where: {
        OR: [
          { followerId: { in: e2eUserIds } },
          { followingId: { in: e2eUserIds } },
        ],
      },
    });

    const notificationResult = await db.notification.deleteMany({
      where: {
        OR: [
          { title: { startsWith: E2E_PREFIX } },
          { body: { contains: E2E_PREFIX } },
          // 테스트 계정으로 발생한 알림은 제목 prefix가 없어도 정리 대상
          ...(e2eUserIds.length > 0
            ? [{ userId: { in: e2eUserIds } }]
            : []),
        ],
      },
    });

    const reviewResult = await db.review.deleteMany({
      where: {
        OR: [
          { product: { title: { startsWith: E2E_PREFIX } } },
          { userId: { in: e2eUserIds } },
        ],
      },
    });

    const reportResult = await db.report.deleteMany({
      where: {
        OR: [
          { description: { startsWith: E2E_PREFIX } },
          { targetProductId: { not: null } },
        ],
        reporterId: { in: e2eUserIds },
      },
    });

    const auditLogResult = await db.auditLog.deleteMany({
      where: {
        OR: [
          { reason: { contains: E2E_PREFIX } },
          { adminId: { in: e2eUserIds } },
        ],
      },
    });

    const chatRoomResult = await db.productChatRoom.deleteMany({
      where: {
        product: { title: { startsWith: E2E_PREFIX } },
      },
    });

    const productResult = await db.product.deleteMany({
      where: { title: { startsWith: E2E_PREFIX } },
    });

    const postResult = await db.post.deleteMany({
      where: { title: { startsWith: E2E_PREFIX } },
    });

    const liveInputResult = await db.liveInput.deleteMany({
      where: {
        OR: [
          { provider_uid: { startsWith: "e2e-live-input" } },
          { name: { startsWith: E2E_PREFIX } },
        ],
      },
    });

    const boardGameResult = await db.boardGame.deleteMany({
      where: {
        locales: {
          some: { title: { startsWith: E2E_PREFIX } },
        },
      },
    });

    const categoryResult = await db.category.deleteMany({
      where: {
        eng_name: "e2e-regression",
        // 다른 데이터가 연결된 카테고리는 안전하게 유지
        products: { none: {} },
      },
    });

    console.log("[E2E cleanup] removed test data");
    console.log(`- follows      : ${followResult.count}`);
    console.log(`- notifications: ${notificationResult.count}`);
    console.log(`- reviews      : ${reviewResult.count}`);
    console.log(`- reports      : ${reportResult.count}`);
    console.log(`- audit logs   : ${auditLogResult.count}`);
    console.log(`- chat rooms   : ${chatRoomResult.count}`);
    console.log(`- products     : ${productResult.count}`);
    console.log(`- posts        : ${postResult.count}`);
    console.log(`- live inputs  : ${liveInputResult.count}`);
    console.log(`- board games  : ${boardGameResult.count}`);
    console.log(`- categories   : ${categoryResult.count}`);
    console.log("- users        : kept for stable login seed");
  } finally {
    await db.$disconnect();
  }
}

cleanupE2EData().catch((error) => {
  console.error("[E2E cleanup] failed");
  console.error(error);
  process.exit(1);
});
