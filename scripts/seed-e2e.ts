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
 * 2026.05.26  임도헌   Modified  E2E 이미지 seed는 Cloudflare variant 없는 원본 URL로 저장하도록 정리
 * 2026.05.26  임도헌   Modified  채팅 목록/상세 E2E 검증용 상품 채팅방 seed 추가
 * 2026.05.26  임도헌   Modified  보드게임 도감 목록/상세 E2E 검증용 공개 locale seed 추가
 * 2026.05.26  임도헌   Modified  다시보기 목록/상세 E2E 검증용 ready VOD seed 추가
 * 2026.05.26  임도헌   Modified  상품 삭제/약속 수락/신고 처리 E2E 전용 seed 데이터 추가
 * 2026.05.26  임도헌   Modified  알림 설정 저장 E2E 반복 실행을 위해 seed 계정 preference 기본값 리셋
 * 2026.06.22  임도헌   Modified  지역 노출 정책 변경에 맞춰 E2E 계정/콘텐츠 지역 seed 보정
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, RegionRange, Role } from "../generated/prisma/client";
import {
  BoardGameLocaleSource,
  BoardGameLocaleStatus,
} from "../generated/prisma/enums";

const E2E_PREFIX = "[E2E]";
const E2E_PASSWORD = "BoardPort!234";
const E2E_PRODUCT_IMAGE_URL =
  "https://imagedelivery.net/3o3hwIVwLhMgAkoMCda2JQ/55cfdd12-033e-4c98-973d-aea323285d00";
const E2E_CHAT_MESSAGE = `${E2E_PREFIX} 채팅 목록 회귀 메시지`;
const E2E_APPOINTMENT_PRODUCT_TITLE = `${E2E_PREFIX} 약속 수락 상품`;
const E2E_APPOINTMENT_MESSAGE = `${E2E_PREFIX} 약속 수락 회귀 제안`;
const E2E_DELETE_PRODUCT_TITLE = `${E2E_PREFIX} 상품 삭제 복귀 테스트`;
const E2E_MODAL_EDIT_PRODUCT_TITLE = `${E2E_PREFIX} 모달 수정 복귀 상품`;
const E2E_MODAL_EDIT_PRODUCT_DESCRIPTION = `${E2E_MODAL_EDIT_PRODUCT_TITLE} 설명입니다.`;
const E2E_REPORT_DESCRIPTION = `${E2E_PREFIX} 관리자 신고 처리 회귀 대상`;
const E2E_BOARDGAME_TITLE = `${E2E_PREFIX} 항해자의 도감`;
const E2E_VOD_TITLE = `${E2E_PREFIX} 다시보기 회귀 방송`;
const E2E_FOLLOWERS_VOD_TITLE = `${E2E_PREFIX} 팔로워 전용 회귀 방송`;

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

const E2E_LOCATION = {
  locationName: "E2E 테스트 항구",
  region1: "서울특별시",
  region2: "마포구",
  region3: "합정동",
  latitude: 37.549,
  longitude: 126.913,
} as const;

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

  const rawConnectionString =
    process.env.DATABASE_URL ?? process.env.DIRECT_URL;

  if (!rawConnectionString) {
    throw new Error("DIRECT_URL or DATABASE_URL is required to seed E2E data.");
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
 * E2E 로그인에 사용할 판매자/구매자/관리자 계정 준비
 *
 * cleanup에서 계정을 삭제하지 않으므로, 없을 때만 생성
 */
async function createE2EUsers(db: PrismaClient) {
  const password = await bcrypt.hash(E2E_PASSWORD, 12);

  const [seller, buyer, admin] = await Promise.all(
    Object.values(E2E_USERS).map(async (user) => {
      const existing = await db.user.findUnique({
        where: { email: user.email },
      });
      if (existing) {
        return db.user.update({
          where: { id: existing.id },
          data: {
            username: user.username,
            role: user.role,
            bannedAt: null,
            regionRange: RegionRange.ALL,
            ...E2E_LOCATION,
          },
        });
      }

      return db.user.create({
        data: {
          username: user.username,
          email: user.email,
          emailVerified: true,
          password,
          role: user.role,
          regionRange: RegionRange.ALL,
          ...E2E_LOCATION,
        },
      });
    })
  );

  await Promise.all(
    [seller, buyer, admin].map(async (user) => {
      const existing = await db.notificationPreferences.findUnique({
        where: { userId: user.id },
      });
      if (existing) {
        return db.notificationPreferences.update({
          where: { userId: user.id },
          data: {
            chat: true,
            trade: true,
            review: true,
            badge: true,
            stream: true,
            keyword: true,
            system: true,
            quietHoursStart: null,
            quietHoursEnd: null,
          },
        });
      }

      return db.notificationPreferences.create({
        data: {
          userId: user.id,
          chat: true,
          trade: true,
          review: true,
          badge: true,
          stream: true,
          keyword: true,
          system: true,
        },
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
 * 기존 상품에 이미지가 없으면 Cloudflare Images 테스트 썸네일만 보강
 */
async function createProduct(
  db: PrismaClient,
  input: {
    title: string;
    sellerId: number;
    categoryId: number;
    imageUrl?: string;
    description?: string;
    resetTradeState?: boolean;
  }
) {
  const existing = await db.product.findFirst({
    where: { title: input.title, userId: input.sellerId },
    include: {
      images: {
        select: { id: true, url: true },
        orderBy: { order: "asc" },
        take: 1,
      },
    },
  });

  if (existing) {
    await db.product.update({
      where: { id: existing.id },
      data: {
        ...(input.resetTradeState
          ? {
              reservation_at: null,
              reservation_userId: null,
              purchased_at: null,
              purchase_userId: null,
            }
          : {}),
        ...(input.description ? { description: input.description } : {}),
        completeness: "PERFECT",
        hidden_at: null,
        ...E2E_LOCATION,
      },
    });

    if (!input.imageUrl) return existing;

    const firstImage = existing.images[0];
    if (!firstImage) {
      await db.productImage.create({
        data: {
          productId: existing.id,
          url: input.imageUrl,
          order: 0,
        },
      });
    }

    if (firstImage && firstImage.url !== input.imageUrl) {
      await db.productImage.update({
        where: { id: firstImage.id },
        data: { url: input.imageUrl },
      });
    }

    return existing;
  }

  return db.product.create({
    data: {
      title: input.title,
      price: 12000,
      description: input.description ?? `${input.title} 설명입니다.`,
      userId: input.sellerId,
      categoryId: input.categoryId,
      game_type: "BOARD_GAME",
      min_players: 2,
      max_players: 4,
      play_time: "30분",
      condition: "GOOD",
      completeness: "PERFECT",
      has_manual: true,
      ...E2E_LOCATION,
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
    return db.post.update({
      where: { id: existing.id },
      data: {
        ...E2E_LOCATION,
        feedRegion1: E2E_LOCATION.region1,
        feedRegion2: E2E_LOCATION.region2,
        feedRegion3: E2E_LOCATION.region3,
      },
    });
  }

  return db.post.create({
    data: {
      title: input.title,
      description: `${input.title} 본문입니다.`,
      category: "FREE",
      userId: input.authorId,
      ...E2E_LOCATION,
      feedRegion1: E2E_LOCATION.region1,
      feedRegion2: E2E_LOCATION.region2,
      feedRegion3: E2E_LOCATION.region3,
    },
  });
}

/**
 * E2E 채팅 목록/상세 진입 테스트용 상품 채팅방 준비
 *
 * 채팅방 목록은 메시지가 없는 방을 제외하므로, 최소 1개의 읽음 텍스트 메시지 보장
 */
async function createChatRoomSeed(
  db: PrismaClient,
  input: {
    productId: number;
    sellerId: number;
    buyerId: number;
  }
) {
  const existingRoom = await db.productChatRoom.findFirst({
    where: {
      productId: input.productId,
      AND: [
        { users: { some: { id: input.sellerId } } },
        { users: { some: { id: input.buyerId } } },
      ],
    },
    select: { id: true },
  });

  const room =
    existingRoom ??
    (await db.productChatRoom.create({
      data: {
        productId: input.productId,
        users: {
          connect: [{ id: input.sellerId }, { id: input.buyerId }],
        },
      },
      select: { id: true },
    }));

  const existingMessage = await db.productMessage.findFirst({
    where: {
      productChatRoomId: room.id,
      payload: E2E_CHAT_MESSAGE,
    },
  });

  if (existingMessage) return room;

  await db.productMessage.create({
    data: {
      productChatRoomId: room.id,
      userId: input.buyerId,
      payload: E2E_CHAT_MESSAGE,
      type: "TEXT",
      isRead: true,
    },
  });

  return room;
}

/**
 * E2E 약속 수락 테스트용 PENDING 약속 준비
 *
 * 이전 실행의 수락/예약 상태가 남아도 seed 단계에서 판매중 + PENDING 제안으로 복원
 */
async function createAppointmentAcceptanceSeed(
  db: PrismaClient,
  input: {
    productId: number;
    sellerId: number;
    buyerId: number;
  }
) {
  const room = await createChatRoomSeed(db, input);

  await db.productMessage.deleteMany({
    where: {
      productChatRoomId: room.id,
      OR: [{ type: "APPOINTMENT" }, { payload: E2E_APPOINTMENT_MESSAGE }],
    },
  });
  await db.appointment.deleteMany({
    where: { chatRoomId: room.id },
  });

  const appointment = await db.appointment.create({
    data: {
      chatRoomId: room.id,
      proposerId: input.buyerId,
      receiverId: input.sellerId,
      meetDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      location: "E2E 테스트 항구 약속 장소",
      latitude: 37.549,
      longitude: 126.913,
    },
  });

  await db.productMessage.create({
    data: {
      productChatRoomId: room.id,
      userId: input.buyerId,
      payload: E2E_APPOINTMENT_MESSAGE,
      type: "APPOINTMENT",
      appointmentId: appointment.id,
      isRead: false,
    },
  });

  await db.productChatRoom.update({
    where: { id: room.id },
    data: { updated_at: new Date() },
  });
}

/**
 * E2E 보드게임 도감 목록/상세 테스트용 공개 항목 준비
 *
 * 공개 도감 노출에 필요한 PUBLISHED locale, 짧은 설명, 검수 시각 보장
 */
async function createBoardGameSeed(db: PrismaClient, reviewerId: number) {
  const boardGame = await db.boardGame.upsert({
    where: { bggId: 990001 },
    update: {},
    create: {
      bggId: 990001,
      primaryName: "E2E Navigator Catalog",
      bggUrl: "https://boardgamegeek.com/boardgame/990001/e2e-navigator",
      yearPublished: 2026,
      minPlayers: 2,
      maxPlayers: 4,
      minPlayTime: 30,
      maxPlayTime: 45,
      playingTime: 45,
      minAge: 10,
      weightAverage: 2.2,
      bggRating: 7.1,
      bayesRating: 6.9,
      bggRank: 990001,
      userRatings: 120,
      bestPlayers: "3",
      goodPlayers: ["2", "3", "4"],
      family: "E2E Regression",
      kickstarted: false,
    },
  });

  await db.boardGameLocale.upsert({
    where: {
      boardGameId_locale: {
        boardGameId: boardGame.id,
        locale: "ko",
      },
    },
    update: {
      title: E2E_BOARDGAME_TITLE,
      aliases: ["E2E 도감 테스트"],
      shortDescription:
        "E2E 회귀 테스트에서 공개 도감 노출을 확인하는 항목입니다.",
      searchKeywords: ["e2e", "도감", "회귀"],
      status: BoardGameLocaleStatus.PUBLISHED,
      sourceType: BoardGameLocaleSource.ADMIN,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    },
    create: {
      boardGameId: boardGame.id,
      locale: "ko",
      title: E2E_BOARDGAME_TITLE,
      aliases: ["E2E 도감 테스트"],
      shortDescription:
        "E2E 회귀 테스트에서 공개 도감 노출을 확인하는 항목입니다.",
      searchKeywords: ["e2e", "도감", "회귀"],
      status: BoardGameLocaleStatus.PUBLISHED,
      sourceType: BoardGameLocaleSource.ADMIN,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    },
  });

  return boardGame;
}

/**
 * E2E 다시보기 목록/상세 진입 테스트용 ready VOD 준비
 *
 * 외부 Cloudflare 웹훅 없이 앱이 이미 처리 완료된 VOD를 읽는 경로만 검증
 */
async function createVodSeed(
  db: PrismaClient,
  input: { ownerId: number; initialVisitorId: number }
) {
  const { ownerId, initialVisitorId } = input;
  await db.follow.deleteMany({
    where: { followerId: initialVisitorId, followingId: ownerId },
  });

  const liveInput = await db.liveInput.upsert({
    where: { userId: ownerId },
    update: {
      provider_uid: "e2e-live-input-990001",
      stream_key: "e2e-stream-key",
      name: `${E2E_PREFIX} 테스트 방송국`,
      status: "DISCONNECTED",
    },
    create: {
      userId: ownerId,
      provider_uid: "e2e-live-input-990001",
      stream_key: "e2e-stream-key",
      name: `${E2E_PREFIX} 테스트 방송국`,
      status: "DISCONNECTED",
    },
  });

  const existingBroadcast = await db.broadcast.findFirst({
    where: { liveInputId: liveInput.id, title: E2E_VOD_TITLE },
    select: { id: true },
  });

  const broadcast =
    existingBroadcast ??
    (await db.broadcast.create({
      data: {
        liveInputId: liveInput.id,
        title: E2E_VOD_TITLE,
        description:
          "E2E 회귀 테스트에서 다시보기 목록/상세 진입을 확인하는 방송입니다.",
        thumbnail: E2E_PRODUCT_IMAGE_URL,
        visibility: "PUBLIC",
        status: "ENDED",
        started_at: new Date(Date.now() - 60 * 60 * 1000),
        ended_at: new Date(Date.now() - 30 * 60 * 1000),
      },
      select: { id: true },
    }));

  await db.vodAsset.upsert({
    where: { provider_asset_id: "e2e-vod-asset-990001" },
    update: {
      broadcastId: broadcast.id,
      thumbnail_url: E2E_PRODUCT_IMAGE_URL,
      duration_sec: 900,
      ready_at: new Date(),
    },
    create: {
      broadcastId: broadcast.id,
      provider_asset_id: "e2e-vod-asset-990001",
      thumbnail_url: E2E_PRODUCT_IMAGE_URL,
      duration_sec: 900,
      ready_at: new Date(),
    },
  });

  const existingFollowersBroadcast = await db.broadcast.findFirst({
    where: { liveInputId: liveInput.id, title: E2E_FOLLOWERS_VOD_TITLE },
    select: { id: true },
  });

  const followersBroadcast = existingFollowersBroadcast
    ? await db.broadcast.update({
        where: { id: existingFollowersBroadcast.id },
        data: {
          description:
            "E2E 회귀 테스트에서 팔로우 후 팔로워 전용 VOD 접근 수렴을 확인하는 방송입니다.",
          thumbnail: E2E_PRODUCT_IMAGE_URL,
          visibility: "FOLLOWERS",
          status: "ENDED",
          started_at: new Date(Date.now() - 90 * 60 * 1000),
          ended_at: new Date(Date.now() - 45 * 60 * 1000),
        },
        select: { id: true },
      })
    : await db.broadcast.create({
        data: {
          liveInputId: liveInput.id,
          title: E2E_FOLLOWERS_VOD_TITLE,
          description:
            "E2E 회귀 테스트에서 팔로우 후 팔로워 전용 VOD 접근 수렴을 확인하는 방송입니다.",
          thumbnail: E2E_PRODUCT_IMAGE_URL,
          visibility: "FOLLOWERS",
          status: "ENDED",
          started_at: new Date(Date.now() - 90 * 60 * 1000),
          ended_at: new Date(Date.now() - 45 * 60 * 1000),
        },
        select: { id: true },
      });

  await db.vodAsset.upsert({
    where: { provider_asset_id: "e2e-followers-vod-asset-990002" },
    update: {
      broadcastId: followersBroadcast.id,
      thumbnail_url: E2E_PRODUCT_IMAGE_URL,
      duration_sec: 1200,
      ready_at: new Date(),
    },
    create: {
      broadcastId: followersBroadcast.id,
      provider_asset_id: "e2e-followers-vod-asset-990002",
      thumbnail_url: E2E_PRODUCT_IMAGE_URL,
      duration_sec: 1200,
      ready_at: new Date(),
    },
  });
}

/**
 * E2E 알림 준비
 *
 * 같은 사용자/제목 알림이 이미 있으면 반복 실행 시 중복 생성 방지
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
 * E2E 관리자 신고 처리 테스트용 PENDING 신고 준비
 *
 * 이전 실행에서 기각/처리된 신고가 남으면 PENDING으로 복원해 같은 시나리오 반복 검증
 */
async function createReportSeed(
  db: PrismaClient,
  input: {
    reporterId: number;
    targetProductId: number;
  }
) {
  const existing = await db.report.findFirst({
    where: {
      reporterId: input.reporterId,
      description: E2E_REPORT_DESCRIPTION,
    },
  });

  if (existing) {
    await db.report.update({
      where: { id: existing.id },
      data: {
        status: "PENDING",
        adminComment: null,
        targetProductId: input.targetProductId,
        reason: "ABUSIVE",
      },
    });
    return;
  }

  await db.report.create({
    data: {
      reporterId: input.reporterId,
      targetProductId: input.targetProductId,
      reason: "ABUSIVE",
      description: E2E_REPORT_DESCRIPTION,
      status: "PENDING",
    },
  });
}

/**
 * E2E 테스트에 필요한 계정, 콘텐츠, 알림을 생성 또는 재사용
 *
 * 삭제된 콘텐츠 알림은 실제 생성/삭제 대신 존재하지 않는 id 링크로 재현
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
    const deleteProduct = await createProduct(db, {
      title: E2E_DELETE_PRODUCT_TITLE,
      sellerId: seller.id,
      categoryId: category.id,
      imageUrl: E2E_PRODUCT_IMAGE_URL,
    });
    const appointmentProduct = await createProduct(db, {
      title: E2E_APPOINTMENT_PRODUCT_TITLE,
      sellerId: seller.id,
      categoryId: category.id,
      imageUrl: E2E_PRODUCT_IMAGE_URL,
      resetTradeState: true,
    });
    await createProduct(db, {
      title: E2E_MODAL_EDIT_PRODUCT_TITLE,
      sellerId: seller.id,
      categoryId: category.id,
      imageUrl: E2E_PRODUCT_IMAGE_URL,
      description: E2E_MODAL_EDIT_PRODUCT_DESCRIPTION,
      resetTradeState: true,
    });
    await createChatRoomSeed(db, {
      productId: product.id,
      sellerId: seller.id,
      buyerId: buyer.id,
    });
    await createAppointmentAcceptanceSeed(db, {
      productId: appointmentProduct.id,
      sellerId: seller.id,
      buyerId: buyer.id,
    });
    await createReportSeed(db, {
      reporterId: buyer.id,
      targetProductId: deleteProduct.id,
    });
    await createBoardGameSeed(db, admin.id);
    await createVodSeed(db, {
      ownerId: seller.id,
      initialVisitorId: buyer.id,
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
