/**
 * File Name : scripts/cleanup-e2e.ts
 * Description : E2E 회귀 테스트용 콘텐츠/알림 cleanup 스크립트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   E2E prefix 데이터와 테스트 계정 알림 정리 스크립트 추가
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
 * 터미널에서 직접 실행할 때 필요한 `.env` 값을 process.env에 채운다.
 *
 * 이미 터미널에서 지정한 환경 변수는 `.env` 값으로 덮어쓰지 않는다.
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
 * Prisma Client용 URL 옵션은 PrismaPg 연결 문자열에서 제거한다.
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
  // PrismaPg는 아래 옵션을 직접 해석하지 않으므로 연결 전에 제거한다.
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
 * E2E 계정은 매번 삭제하지 않고 재사용해 로그인 seed를 안정적으로 유지한다.
 */
async function cleanupE2EData() {
  const db = createDb();

  try {
    const e2eUsers = await db.user.findMany({
      where: { email: { in: E2E_USER_EMAILS } },
      select: { id: true },
    });
    const e2eUserIds = e2eUsers.map((user) => user.id);

    const notificationResult = await db.notification.deleteMany({
      where: {
        OR: [
          { title: { startsWith: E2E_PREFIX } },
          { body: { contains: E2E_PREFIX } },
          // 테스트 계정으로 발생한 알림은 제목 prefix가 없어도 정리 대상이다.
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

    const productResult = await db.product.deleteMany({
      where: { title: { startsWith: E2E_PREFIX } },
    });

    const postResult = await db.post.deleteMany({
      where: { title: { startsWith: E2E_PREFIX } },
    });

    const categoryResult = await db.category.deleteMany({
      where: {
        eng_name: "e2e-regression",
        // 다른 데이터가 연결된 카테고리는 안전하게 남긴다.
        products: { none: {} },
      },
    });

    console.log("[E2E cleanup] removed test data");
    console.log(`- notifications: ${notificationResult.count}`);
    console.log(`- reviews      : ${reviewResult.count}`);
    console.log(`- products     : ${productResult.count}`);
    console.log(`- posts        : ${postResult.count}`);
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
