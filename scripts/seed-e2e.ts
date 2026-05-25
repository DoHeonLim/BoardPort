/**
 * File Name : scripts/seed-e2e.ts
 * Description : E2E 회귀 테스트용 계정/콘텐츠/알림 seed 스크립트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.24  임도헌   Created   E2E 전용 테스트 계정/콘텐츠/알림 seed 스크립트 추가
 * 2026.05.25  임도헌   Modified  seed 이미지 외부 도메인 의존 제거로 E2E 페이지 렌더링 안정화
 * 2026.05.25  임도헌   Modified  E2E 계정 삭제 cascade 기준으로 reset 순서 정리
 * 2026.05.25  임도헌   Modified  seed 스크립트에서 DATABASE_URL/DIRECT_URL fallback 처리
 * 2026.05.25  임도헌   Modified  delete 권한 없이도 반복 실행 가능한 upsert 기반 seed로 전환
 * 2026.05.25  임도헌   Modified  update/delete 없이 기존 seed를 재사용하는 create-if-missing 방식으로 정리
 * 2026.05.25  임도헌   Modified  E2E seed 조회/생성은 앱 런타임과 같은 DATABASE_URL 우선으로 복원
 * 2026.05.25  임도헌   Modified  PrismaPg 어댑터용 DB URL에서 Prisma 전용 query param 제거
 * 2026.05.25  임도헌   Modified  Cloudflare Images 테스트 썸네일을 살아 있는 seed 상품에만 연결
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../generated/prisma/client";

const E2E_PREFIX = "[E2E]";
const E2E_PASSWORD = "BoardPort!234";
const E2E_PRODUCT_IMAGE_URL =
  "https://imagedelivery.net/3o3hwIVwLhMgAkoMCda2JQ/55cfdd12-033e-4c98-973d-aea323285d00/public";

const E2E_USERS = {
  seller: {
    username: "e2e_seller",
    email: "e2e.seller@boardport.test",
    role: Role.USER,
  },
  buyer: {
    username: "e2e_buyer",
    email: "e2e.buyer@boardport.test",
    role: Role.USER,
  },
  admin: {
    username: "e2e_admin",
    email: "e2e.admin@boardport.test",
    role: Role.ADMIN,
  },
} as const;

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
    throw new Error("DIRECT_URL or DATABASE_URL is required to seed E2E data.");
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
 * E2E 로그인에 사용할 판매자/구매자/관리자 계정 준비
 *
 * 계정은 cleanup에서 삭제하지 않고 재사용하므로, 없을 때만 새로 만든다.
 */
async function createE2EUsers(db: PrismaClient) {
  const password = await bcrypt.hash(E2E_PASSWORD, 12);

  const [seller, buyer, admin] = await Promise.all(
    Object.values(E2E_USERS).map(async (user) => {
      const existing = await db.user.findUnique({
        where: { email: user.email },
      });
      if (existing) return existing;

      return db.user.create({
        data: {
          username: user.username,
          email: user.email,
          emailVerified: true,
          password,
          role: user.role,
          locationName: "E2E 테스트 항구",
          region1: "서울특별시",
          region2: "마포구",
          region3: "합정동",
          latitude: 37.549,
          longitude: 126.913,
        },
      });
    })
  );

  await Promise.all(
    [seller, buyer, admin].map(async (user) => {
      const existing = await db.notificationPreferences.findUnique({
        where: { userId: user.id },
      });
      if (existing) return existing;

      return db.notificationPreferences.create({
        data: { userId: user.id },
      });
    })
  );

  return { seller, buyer, admin };
}

/** E2E 상품이 사용할 전용 카테고리 준비 */
async function createE2ECategory(db: PrismaClient) {
  const existing = await db.category.findFirst({
    where: { eng_name: "e2e-regression" },
  });

  if (existing) {
    return existing;
  }

  return db.category.create({
    data: {
      eng_name: "e2e-regression",
      kor_name: "E2E 회귀 테스트",
      icon: "TEST",
      description: "E2E 자동화 테스트 전용 카테고리",
    },
  });
}

/**
 * E2E 목록/알림 테스트용 살아 있는 상품 준비
 *
 * 기존 상품에 이미지가 없으면 Cloudflare Images 테스트 썸네일만 보강한다.
 */
async function createProduct(
  db: PrismaClient,
  input: {
    title: string;
    sellerId: number;
    categoryId: number;
    imageUrl?: string;
  }
) {
  const existing = await db.product.findFirst({
    where: { title: input.title, userId: input.sellerId },
    include: {
      images: {
        select: { id: true },
        take: 1,
      },
    },
  });

  if (existing) {
    if (input.imageUrl && existing.images.length === 0) {
      await db.productImage.create({
        data: {
          productId: existing.id,
          url: input.imageUrl,
          order: 0,
        },
      });
    }

    return existing;
  }

  return db.product.create({
    data: {
      title: input.title,
      price: 12000,
      description: `${input.title} 설명입니다.`,
      userId: input.sellerId,
      categoryId: input.categoryId,
      game_type: "BOARD_GAME",
      min_players: 2,
      max_players: 4,
      play_time: "30분",
      condition: "GOOD",
      completeness: "COMPLETE",
      has_manual: true,
      locationName: "E2E 테스트 항구",
      region1: "서울특별시",
      region2: "마포구",
      region3: "합정동",
      latitude: 37.549,
      longitude: 126.913,
      images: input.imageUrl
        ? {
            create: [
              {
                url: input.imageUrl,
                order: 0,
              },
            ],
          }
        : undefined,
    },
  });
}

/** E2E 목록 테스트용 살아 있는 게시글 준비 */
async function createPost(
  db: PrismaClient,
  input: {
    title: string;
    authorId: number;
  }
) {
  const existing = await db.post.findFirst({
    where: { title: input.title, userId: input.authorId },
  });

  if (existing) {
    return existing;
  }

  return db.post.create({
    data: {
      title: input.title,
      description: `${input.title} 본문입니다.`,
      category: "FREE",
      userId: input.authorId,
      locationName: "E2E 테스트 항구",
      region1: "서울특별시",
      region2: "마포구",
      region3: "합정동",
      latitude: 37.549,
      longitude: 126.913,
    },
  });
}

/**
 * E2E 알림 준비
 *
 * 같은 사용자/제목 알림이 이미 있으면 반복 실행 시 중복 생성하지 않는다.
 */
async function upsertNotification(
  db: PrismaClient,
  input: {
    userId: number;
    title: string;
    body: string;
    type: string;
    link: string | null;
  }
) {
  const existing = await db.notification.findFirst({
    where: {
      userId: input.userId,
      title: input.title,
    },
  });
  if (existing) return;

  await db.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      type: input.type,
      link: input.link,
      image: null,
    },
  });
}

/**
 * E2E 테스트에 필요한 계정, 콘텐츠, 알림을 생성 또는 재사용
 *
 * 삭제된 콘텐츠 알림은 실제 데이터를 만들고 지우지 않고, 존재하지 않는 id 링크로 재현한다.
 */
async function seedE2EData() {
  const db = createDb();

  try {
    const { seller, buyer, admin } = await createE2EUsers(db);
    const category = await createE2ECategory(db);

    const product = await createProduct(db, {
      title: `${E2E_PREFIX} 삭제 복귀 상품`,
      sellerId: seller.id,
      categoryId: category.id,
      imageUrl: E2E_PRODUCT_IMAGE_URL,
    });
    const post = await createPost(db, {
      title: `${E2E_PREFIX} 삭제 복귀 게시글`,
      authorId: seller.id,
    });

    const [{ _max: maxProductId }, { _max: maxPostId }] = await Promise.all([
      db.product.aggregate({ _max: { id: true } }),
      db.post.aggregate({ _max: { id: true } }),
    ]);
    const missingProductId = (maxProductId.id ?? 0) + 100000;
    const missingPostId = (maxPostId.id ?? 0) + 100000;

    await Promise.all([
      upsertNotification(db, {
        userId: buyer.id,
        title: `${E2E_PREFIX} 상품 알림`,
        body: `${product.title} 상품으로 이동할 수 있어야 합니다.`,
        type: "TRADE",
        link: `/products/view/${product.id}`,
      }),
      upsertNotification(db, {
        userId: buyer.id,
        title: `${E2E_PREFIX} 게시글 알림`,
        body: `${post.title} 게시글로 이동할 수 있어야 합니다.`,
        type: "SYSTEM",
        link: `/posts/${post.id}`,
      }),
      upsertNotification(db, {
        userId: buyer.id,
        title: `${E2E_PREFIX} 삭제된 상품 알림`,
        body: `${E2E_PREFIX} 삭제된 상품 알림 대상 상품은 삭제되어 이동할 수 없어야 합니다.`,
        type: "TRADE",
        link: `/products/view/${missingProductId}`,
      }),
      upsertNotification(db, {
        userId: buyer.id,
        title: `${E2E_PREFIX} 삭제된 게시글 알림`,
        body: `${E2E_PREFIX} 삭제된 게시글 알림 대상 게시글은 삭제되어 이동할 수 없어야 합니다.`,
        type: "SYSTEM",
        link: `/posts/${missingPostId}`,
      }),
    ]);

    console.log("[E2E seed] created test data");
    console.log(`- seller: ${E2E_USERS.seller.email}`);
    console.log(`- buyer : ${E2E_USERS.buyer.email}`);
    console.log(`- admin : ${E2E_USERS.admin.email}`);
    console.log(`- password: ${E2E_PASSWORD}`);
  } finally {
    await db.$disconnect();
  }
}

seedE2EData().catch((error) => {
  console.error("[E2E seed] failed");
  console.error(error);
  process.exit(1);
});
