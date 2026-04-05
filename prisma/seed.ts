/**
File Name : prisma/seed.ts
Description : 카테고리, 뱃지 시드
Author : 임도헌

History
Date        Author   Status    Description
2024.12.15  임도헌   Created
2024.12.15  임도헌   Modified  카테고리 시드 추가
2025.04.13  임도헌   Modified  뱃지 시드 추가
2025.05.08  임도헌   Modified  스트리밍 카테고리 시드 추가
2025.12.07  임도헌   Modified  뱃지 설명 수정
2026.02.25  임도헌   Modified  Cloudflare Images hash 하드코딩 제거
2026.03.09  임도헌   Modified  제품 카테고리를 메커니즘 중심 개편안으로 교체
2026.03.09  임도헌   Modified  제품 데이터 보존을 위해 참조 데이터 비파괴 시드 방식으로 전환
2026.03.28  임도헌   Modified  뱃지 설명 문구를 실제 획득 조건과 사용자 친화 용어로 정리
*/

// prisma db seed 사용해서 데이터 추가

import db from "@/lib/db";
import { PRODUCT_CATEGORY_SEED_DRAFT } from "./productCategorySeedDraft";

type CategorySeed = (typeof PRODUCT_CATEGORY_SEED_DRAFT)[number];

type StreamCategorySeed = {
  eng_name: string;
  kor_name: string;
  icon: string;
  description: string;
  subcategories: {
    eng_name: string;
    kor_name: string;
    icon: string;
    description: string;
  }[];
};

async function syncProductCategories(categories: CategorySeed[]) {
  for (const category of categories) {
    const { subcategories, ...categoryData } = category;

    const existingMainCategory = await db.category.findFirst({
      where: {
        eng_name: category.eng_name,
        parentId: null,
      },
    });

    const mainCategory = existingMainCategory
      ? await db.category.update({
          where: { id: existingMainCategory.id },
          data: categoryData,
        })
      : await db.category.create({
          data: categoryData,
        });

    for (const subcategory of subcategories) {
      const existingSubCategory = await db.category.findFirst({
        where: {
          eng_name: subcategory.eng_name,
        },
      });

      if (existingSubCategory) {
        await db.category.update({
          where: { id: existingSubCategory.id },
          data: {
            ...subcategory,
            parentId: mainCategory.id,
          },
        });
      } else {
        await db.category.create({
          data: {
            ...subcategory,
            parentId: mainCategory.id,
          },
        });
      }
    }
  }
}

async function cleanupUnusedProductCategories(categories: CategorySeed[]) {
  const mainCategoryEngNames = categories.map((category) => category.eng_name);
  const subCategoryEngNames = categories.flatMap((category) =>
    category.subcategories.map((subcategory) => subcategory.eng_name)
  );
  const allowedEngNames = new Set([
    ...mainCategoryEngNames,
    ...subCategoryEngNames,
  ]);

  await db.category.deleteMany({
    where: {
      eng_name: {
        notIn: Array.from(allowedEngNames),
      },
      products: {
        none: {},
      },
      children: {
        none: {},
      },
    },
  });

  await db.category.deleteMany({
    where: {
      eng_name: {
        notIn: mainCategoryEngNames,
      },
      parentId: null,
      products: {
        none: {},
      },
      children: {
        none: {},
      },
    },
  });
}

async function syncStreamCategories(categories: StreamCategorySeed[]) {
  for (const category of categories) {
    const { subcategories, ...categoryData } = category;

    const existingMainCategory = await db.streamCategory.findFirst({
      where: {
        eng_name: category.eng_name,
        parentId: null,
      },
    });

    const mainCategory = existingMainCategory
      ? await db.streamCategory.update({
          where: { id: existingMainCategory.id },
          data: categoryData,
        })
      : await db.streamCategory.create({
          data: categoryData,
        });

    for (const subcategory of subcategories) {
      const existingSubCategory = await db.streamCategory.findFirst({
        where: {
          eng_name: subcategory.eng_name,
        },
      });

      if (existingSubCategory) {
        await db.streamCategory.update({
          where: { id: existingSubCategory.id },
          data: {
            ...subcategory,
            parentId: mainCategory.id,
          },
        });
      } else {
        await db.streamCategory.create({
          data: {
            ...subcategory,
            parentId: mainCategory.id,
          },
        });
      }
    }
  }
}

async function main() {
  const categories = PRODUCT_CATEGORY_SEED_DRAFT;
  await syncProductCategories(categories);
  await cleanupUnusedProductCategories(categories);

  // 스트리밍 카테고리 데이터
  const streamCategories = [
    {
      eng_name: "GAME_PLAY",
      kor_name: "게임 플레이",
      icon: "🎮",
      description: "실시간 게임 플레이 스트리밍",
      subcategories: [
        {
          eng_name: "MULTIPLAYER",
          kor_name: "멀티플레이",
          icon: "👥",
          description: "여러 명이 함께하는 게임 플레이",
        },
        {
          eng_name: "SOLO_PLAY",
          kor_name: "솔로 플레이",
          icon: "🎯",
          description: "개인 플레이 스트리밍",
        },
        {
          eng_name: "TOURNAMENT",
          kor_name: "토너먼트",
          icon: "🏆",
          description: "대회나 토너먼트 스트리밍",
        },
      ],
    },
    {
      eng_name: "REVIEW",
      kor_name: "리뷰",
      icon: "📝",
      description: "게임 리뷰 및 분석",
      subcategories: [
        {
          eng_name: "NEW_GAME_REVIEW",
          kor_name: "신규 게임 리뷰",
          icon: "🆕",
          description: "새로 출시된 게임 리뷰",
        },
        {
          eng_name: "CLASSIC_REVIEW",
          kor_name: "클래식 게임 리뷰",
          icon: "⭐",
          description: "클래식 게임 리뷰",
        },
        {
          eng_name: "COMPARISON_REVIEW",
          kor_name: "비교 리뷰",
          icon: "⚖️",
          description: "게임 비교 분석",
        },
      ],
    },
    {
      eng_name: "WORKTHROUGH",
      kor_name: "공략",
      icon: "📚",
      description: "게임 공략 및 팁",
      subcategories: [
        {
          eng_name: "BEGINNER_GUIDE",
          kor_name: "초보자 가이드",
          icon: "🎓",
          description: "초보자를 위한 게임 가이드",
        },
        {
          eng_name: "STRATEGY_WORKTHROUGH",
          kor_name: "전략 공략",
          icon: "🎯",
          description: "게임 전략과 공략",
        },
        {
          eng_name: "RULE_DESCRIPTION",
          kor_name: "규칙 설명",
          icon: "📖",
          description: "게임 규칙 상세 설명",
        },
      ],
    },
    {
      eng_name: "COMMUNITY",
      kor_name: "커뮤니티",
      icon: "💬",
      description: "커뮤니티 활동",
      subcategories: [
        {
          eng_name: "Q&A",
          kor_name: "질문과 답변",
          icon: "❓",
          description: "게임 관련 질문과 답변",
        },
        {
          eng_name: "DISCUSSION",
          kor_name: "토론",
          icon: "🗣️",
          description: "게임 관련 토론",
        },
        {
          eng_name: "EVENT",
          kor_name: "이벤트",
          icon: "🎉",
          description: "커뮤니티 이벤트",
        },
      ],
    },
  ];

  await syncStreamCategories(streamCategories);

  const CF_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;

  // 뱃지 데이터 생성
  const badges = [
    {
      name: "FIRST_DEAL",
      icon: `https://imagedelivery.net/${CF_HASH}/63dbdbf0-61bc-4632-b3cb-698f99bd1500`,
      description:
        "첫 거래를 성공적으로 완료한 첫 거래 선원입니다. 작은 목선에서 첫 거래의 기쁨을 맛보았어요!",
    },
    {
      name: "POWER_SELLER",
      icon: `https://imagedelivery.net/${CF_HASH}/18844d35-d462-4d59-839d-2fcc25134800`,
      description:
        "판매 완료 10건 이상과 평균 평점 4.0 이상을 기록한 노련한 상인입니다. 보드포트에서 믿을 수 있는 거래를 이어가고 있어요!",
    },
    {
      name: "QUICK_RESPONSE",
      icon: `https://imagedelivery.net/${CF_HASH}/b5a00613-399d-476f-2c00-fe3bd0297100`,
      description:
        "최근 60일 기준 50개 이상의 메시지, 80% 이상의 응답률과 60분 이내의 빠른 답변을 기록한 신속한 교신병입니다. 조개껍데기 무전기로 발 빠른 소통을 이어가고 있어요!",
    },
    {
      name: "FIRST_POST",
      icon: `https://imagedelivery.net/${CF_HASH}/2239e58c-d339-4777-be77-7d9a38fc7300`,
      description:
        "첫 게시글을 작성한 항해일지 작성자입니다. 등대 도서관에서 첫 발자국을 남겼어요!",
    },
    {
      name: "POPULAR_WRITER",
      icon: `https://imagedelivery.net/${CF_HASH}/6791fdc6-dac2-4858-2db6-448b246a1e00`,
      description:
        "최근 6개월 동안 5개 이상의 게시글과 총 50개 이상의 좋아요를 받은 인기 항해사입니다. 난파선 카페의 유명 작가가 되었어요!",
    },
    {
      name: "ACTIVE_COMMENTER",
      icon: `https://imagedelivery.net/${CF_HASH}/9cc7214f-ae58-43ab-ba4d-75d31a9f6500`,
      description:
        "최근 30일 동안 30개 이상의 댓글을 남기고, 그중 보물지도·항해일지 카테고리에 남긴 댓글 비율이 30% 이상인 열정적인 통신사입니다.",
    },
    {
      name: "GAME_COLLECTOR",
      icon: `https://imagedelivery.net/${CF_HASH}/ee622a84-9d9c-4201-7dc6-a778069e2e00`,
      description:
        "총 20회 이상 거래하고, 서로 다른 카테고리 3종류 이상과 게임 타입 2종류 이상을 경험한 보물선 수집가입니다. 여러 항구를 넘나들며 풍부한 게임 경험을 쌓고 있어요!",
    },
    {
      name: "GENRE_MASTER",
      icon: `https://imagedelivery.net/${CF_HASH}/bb30cb4b-d65a-481b-e65e-f5aead306100`,
      description:
        "한 장르(카테고리)에서 10회 이상의 거래와 4.4 이상의 평점을 기록한 장르의 항해사입니다.",
    },
    {
      name: "RULE_SAGE",
      icon: `https://imagedelivery.net/${CF_HASH}/90fb9c56-d6be-49da-fe60-0471bfbbc400`,
      description:
        "10개 이상의 규칙 설명 게시글과 500회 이상의 조회수를 받은 규칙의 현자입니다.",
    },
    {
      name: "VERIFIED_SAILOR",
      icon: `https://imagedelivery.net/${CF_HASH}/0534d88d-1944-4844-563c-20cc0a843200`,
      description:
        "이메일 인증과 전화번호 등록을 모두 완료한 인증된 선원입니다. 신뢰할 수 있는 나침반을 들고 있어요!",
    },
    {
      name: "FAIR_TRADER",
      icon: `https://imagedelivery.net/${CF_HASH}/04b908dd-e9c7-40bb-4786-fe2b5af89900`,
      description:
        "5회 이상의 거래에서 4.5 이상의 높은 평점을 기록한 정직한 상인입니다. 공정한 거래로 신뢰를 쌓고 있어요!",
    },
    {
      name: "QUALITY_MASTER",
      icon: `https://imagedelivery.net/${CF_HASH}/4b6ed65a-732d-439e-4509-faa53dcb9400`,
      description:
        "8회 이상 판매를 완료하고, 그 중 70% 이상을 새제품급/거의 새것 상태와 완벽한 구성으로 유지한 품질의 달인입니다!",
    },
    {
      name: "EARLY_SAILOR",
      icon: `https://imagedelivery.net/${CF_HASH}/63d81c0f-250a-4a87-ffea-142726992f00`,
      description:
        "2025년 1월 1일 이전에 가입하고 활동한 첫 항해 선원입니다. 새벽 항구에서 첫 닻을 올린 선구자예요!",
    },
    {
      name: "PORT_FESTIVAL",
      icon: `https://imagedelivery.net/${CF_HASH}/7abfbeaa-f4e4-4499-f4ce-fb6bf9745d00`,
      description:
        "최근 한 달 동안 3개 이상의 게시글, 10개 이상의 댓글, 1회 이상의 성공적인 거래로 항구를 뜨겁게 달군 축제의 주인공입니다. 당신의 활발한 활동이 우리 항구를 빛나게 만들어요!",
    },
    {
      name: "BOARD_EXPLORER",
      icon: `https://imagedelivery.net/${CF_HASH}/c033d8e8-a96f-4632-6f86-cc76b62a9700`,
      description:
        "게임 타입 4종류 이상을 거래하고, 보물지도·항해일지 게시글을 7개 이상 남기며, 최근 6개월 기준 댓글 10개와 좋아요 30개 이상의 커뮤니티 기여도를 보여준 보드게임 탐험가입니다. 새로운 게임의 바다를 끝없이 탐험하고 있어요!",
    },
  ];

  // 뱃지 생성/갱신
  for (const badge of badges) {
    await db.badge.upsert({
      where: { name: badge.name },
      update: {
        icon: badge.icon,
        description: badge.description,
      },
      create: badge,
    });
  }

  console.log("카테고리, 스트리밍 카테고리, 뱃지 시드 완료! (비파괴 모드)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
