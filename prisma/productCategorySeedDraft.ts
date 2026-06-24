/**
 * File Name : prisma/productCategorySeedDraft.ts
 * Description : 제품 카테고리 개편용 시드 초안
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.09  임도헌   Created   BGG 상위권 메커니즘 기준 제품 카테고리 재구성 초안 추가
 * 2026.03.12  임도헌   Modified  메커니즘 중심 카테고리 초안 구조와 대분류/소분류 설계 의도 명확화
 */

/**
 * 제품 카테고리 시드 초안 타입
 * - 대분류/소분류 표시 정보 정의
 * - seed.ts용 SSOT 타입
 */
type ProductCategorySeedDraft = {
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

/**
 * 제품 카테고리 개편 초안
 *
 * 설계 원칙
 * - 대분류/소분류는 "플레이 경험 / 메커니즘" 축으로 통일
 * - 인원, 플레이타임, 난이도, 테마는 ProductForm의 별도 메타 필드로 분리
 * - OTHER(기타)는 자식 없는 예외 대분류 유지
 */
export const PRODUCT_CATEGORY_SEED_DRAFT: ProductCategorySeedDraft[] = [
  {
    eng_name: "EURO_STRATEGY",
    kor_name: "전략/유로",
    icon: "♟️",
    description: "장기 계획과 효율 최적화가 중심인 전략형 게임",
    subcategories: [
      {
        eng_name: "RESOURCE_MANAGEMENT",
        kor_name: "자원관리",
        icon: "💰",
        description: "자원 수급과 소비 밸런스를 관리하는 게임",
      },
      {
        eng_name: "ENGINE_BUILDING",
        kor_name: "엔진빌딩",
        icon: "⚙️",
        description: "점점 강해지는 개인 시스템을 구축하는 게임",
      },
      {
        eng_name: "WORKER_PLACEMENT",
        kor_name: "워커플레이스먼트",
        icon: "👷",
        description: "행동 칸 배치와 순서 선택이 핵심인 게임",
      },
      {
        eng_name: "CIVILIZATION_DEVELOPMENT",
        kor_name: "문명/성장",
        icon: "🏛️",
        description: "세력이나 문명을 성장시키는 중장기 전략 게임",
      },
    ],
  },
  {
    eng_name: "CARD_DECKBUILDING",
    kor_name: "카드/덱빌딩",
    icon: "🃏",
    description: "카드 운용과 구성 변화가 중심인 게임",
    subcategories: [
      {
        eng_name: "DECK_BUILDING",
        kor_name: "덱빌딩",
        icon: "📚",
        description: "게임 중 덱을 구성하고 강화하는 게임",
      },
      {
        eng_name: "HAND_MANAGEMENT",
        kor_name: "핸드관리",
        icon: "✋",
        description: "손패 활용 최적화가 중요한 게임",
      },
      {
        eng_name: "TRICK_TAKING",
        kor_name: "트릭테이킹",
        icon: "🎴",
        description: "카드 한 수 한 수의 승부가 핵심인 게임",
      },
      {
        eng_name: "SET_COLLECTION",
        kor_name: "셋컬렉션",
        icon: "🧺",
        description: "카드나 타일 조합을 모아 점수를 내는 게임",
      },
    ],
  },
  {
    eng_name: "COOPERATIVE",
    kor_name: "협력",
    icon: "🤝",
    description: "플레이어 전원이 협력해 목표를 달성하는 게임",
    subcategories: [
      {
        eng_name: "DISASTER_RESPONSE",
        kor_name: "재난대응",
        icon: "🚨",
        description: "위기 관리와 역할 분담 중심의 협력 게임",
      },
      {
        eng_name: "DUNGEON_CRAWLER",
        kor_name: "던전크롤",
        icon: "🗡️",
        description: "전투와 탐험 중심의 협력 어드벤처 게임",
      },
      {
        eng_name: "CAMPAIGN_LEGACY",
        kor_name: "캠페인/레거시",
        icon: "📜",
        description: "연속 플레이와 서사 진행이 핵심인 게임",
      },
      {
        eng_name: "COOP_PUZZLE",
        kor_name: "퍼즐협력",
        icon: "🧩",
        description: "함께 퍼즐을 풀며 상황을 해결하는 게임",
      },
    ],
  },
  {
    eng_name: "DEDUCTION_BLUFFING",
    kor_name: "추리/심리전",
    icon: "🕵️",
    description: "정보 추론과 심리전이 핵심인 게임",
    subcategories: [
      {
        eng_name: "SOCIAL_DEDUCTION",
        kor_name: "사회적추리",
        icon: "🗣️",
        description: "정체 숨기기와 토론이 중심인 게임",
      },
      {
        eng_name: "CRIME_MYSTERY",
        kor_name: "범인추리",
        icon: "🔍",
        description: "단서 수집과 사건 해결이 핵심인 게임",
      },
      {
        eng_name: "BLUFFING",
        kor_name: "블러핑",
        icon: "🎭",
        description: "속임수와 눈치싸움이 중심인 게임",
      },
      {
        eng_name: "NEGOTIATION",
        kor_name: "협상",
        icon: "🤫",
        description: "거래와 담판, 설득이 중요한 게임",
      },
    ],
  },
  {
    eng_name: "CONFLICT_CONTROL",
    kor_name: "전투/영향력",
    icon: "⚔️",
    description: "충돌, 확장, 세력 다툼이 중심인 게임",
    subcategories: [
      {
        eng_name: "AREA_CONTROL",
        kor_name: "에어리어컨트롤",
        icon: "🗺️",
        description: "영역 점유와 세력 확장이 중요한 게임",
      },
      {
        eng_name: "TACTICAL_COMBAT",
        kor_name: "전술전투",
        icon: "🛡️",
        description: "유닛 운영과 전투 판단이 핵심인 게임",
      },
      {
        eng_name: "ASYMMETRIC_MATCHUP",
        kor_name: "비대칭대결",
        icon: "🧠",
        description: "서로 다른 능력과 목표로 경쟁하는 게임",
      },
      {
        eng_name: "POLITICAL_INFLUENCE",
        kor_name: "정치/영향력",
        icon: "👑",
        description: "투표, 설득, 영향력 싸움이 중심인 게임",
      },
    ],
  },
  {
    eng_name: "ABSTRACT_PUZZLE",
    kor_name: "퍼즐/추상",
    icon: "🧩",
    description: "규칙의 순수한 구조와 공간 계산이 중요한 게임",
    subcategories: [
      {
        eng_name: "TILE_PLACEMENT",
        kor_name: "타일배치",
        icon: "🟦",
        description: "타일 연결과 배치 효율이 핵심인 게임",
      },
      {
        eng_name: "PATTERN_BUILDING",
        kor_name: "패턴빌딩",
        icon: "🔷",
        description: "모양과 조합을 맞춰 점수를 내는 게임",
      },
      {
        eng_name: "ABSTRACT_STRATEGY",
        kor_name: "추상전략",
        icon: "♞",
        description: "테마보다 수읽기와 구조가 중심인 게임",
      },
      {
        eng_name: "ROUTE_CONNECTION",
        kor_name: "루트연결",
        icon: "🚂",
        description: "노선, 길, 연결망을 만드는 게임",
      },
    ],
  },
  {
    eng_name: "PARTY_CASUAL",
    kor_name: "파티/캐주얼",
    icon: "🎉",
    description: "가볍고 빠르게 즐기는 대중형 게임",
    subcategories: [
      {
        eng_name: "WORD_QUIZ",
        kor_name: "단어/퀴즈",
        icon: "❓",
        description: "단어 연상과 퀴즈 풀이 중심의 게임",
      },
      {
        eng_name: "DRAWING_EXPRESSION",
        kor_name: "드로잉/표현",
        icon: "✏️",
        description: "그리기, 몸짓, 표현 활동 중심의 게임",
      },
      {
        eng_name: "DEXTERITY_SPEED",
        kor_name: "순발력",
        icon: "⚡",
        description: "손재주와 빠른 반응이 중요한 게임",
      },
      {
        eng_name: "FAMILY_PARTY",
        kor_name: "가족파티",
        icon: "👨‍👩‍👧‍👦",
        description: "연령대가 넓고 설명이 쉬운 파티 게임",
      },
    ],
  },
  {
    eng_name: "THEMATIC_ADVENTURE",
    kor_name: "테마/어드벤처",
    icon: "🌌",
    description: "세계관 몰입과 서사 경험이 강조되는 게임",
    subcategories: [
      {
        eng_name: "FANTASY",
        kor_name: "판타지",
        icon: "🐉",
        description: "판타지 세계관 중심의 어드벤처 게임",
      },
      {
        eng_name: "SCIENCE_FICTION",
        kor_name: "SF",
        icon: "🚀",
        description: "우주, 미래기술, SF 테마 중심의 게임",
      },
      {
        eng_name: "HORROR",
        kor_name: "호러",
        icon: "👻",
        description: "공포, 긴장, 생존 테마 중심의 게임",
      },
      {
        eng_name: "EXPLORATION",
        kor_name: "탐험",
        icon: "🧭",
        description: "탐사와 발견의 서사를 즐기는 게임",
      },
    ],
  },
  {
    eng_name: "WAR_HISTORY",
    kor_name: "전쟁/역사",
    icon: "🏰",
    description: "역사적 전장과 전쟁 시뮬레이션 중심의 게임",
    subcategories: [
      {
        eng_name: "WARGAME",
        kor_name: "워게임",
        icon: "🎖️",
        description: "전쟁 작전 수행과 전술이 중심인 게임",
      },
      {
        eng_name: "HISTORICAL_SIMULATION",
        kor_name: "역사시뮬",
        icon: "📜",
        description: "실제 역사나 시대상을 반영한 게임",
      },
      {
        eng_name: "MILITARY_STRATEGY",
        kor_name: "군사전략",
        icon: "🪖",
        description: "군사적 판단과 장기 전략이 핵심인 게임",
      },
      {
        eng_name: "HISTORICAL_CIVILIZATION",
        kor_name: "문명사",
        icon: "🏺",
        description: "역사 흐름 속 세력 성장과 운영을 다루는 게임",
      },
    ],
  },
  {
    eng_name: "OTHER",
    kor_name: "기타",
    icon: "📦",
    description: "다른 분류에 속하지 않는 기타 보드게임",
    subcategories: [],
  },
];
