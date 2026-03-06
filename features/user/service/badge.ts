/**
 * File Name : features/user/service/badge.ts
 * Description : 뱃지 조회 및 부여 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.05  임도헌   Created
 * 2025.10.05  임도헌   Moved      app/(tabs)/profile/actions → lib/user로 분리
 * 2025.10.07  임도헌   Modified   반환 타입(Badge[]) 추가
 * 2025.10.23  임도헌   Modified   태그 네이밍 표준화와 wrapper 일관 적용
 * 2025.10.29  임도헌   Modified   nextCache 인자 간소화, 템플릿 리터럴 오류 수정, 주석 보강
 * 2026.01.19  임도헌   Moved      lib/user -> features/user/lib
 * 2026.01.24  임도헌   Merged     badges.ts, getUserBadges.ts 통합
 * 2026.03.03  임도헌   Modified   unstable_cache 래퍼 제거 및 함수명 단순화 (getAllBadges, getUserBadges)
 * 2026.03.05  임도헌   Modified   주석 최신화
 * 2026.03.07  임도헌   Modified   push 성공 판정 기준을 result.data.sent로 정정
 */

import "server-only";

import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import { supabase } from "@/lib/supabase";
import { getBadgeKoreanName } from "@/features/user/utils/badge";
import { sendPushNotification } from "@/features/notification/service/sender";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/utils/policy";
import {
  calculateAverageRating,
  calculateChatResponseRate,
  calculateCategoryRating,
  isPopularity,
} from "@/features/user/service/metric";
import type { Badge } from "@/features/user/types";

// -----------------------------------------------------------------------------
// 1. 조회 (Read)
// -----------------------------------------------------------------------------

/**
 * 전체 뱃지 메타데이터 목록 조회 로직
 *
 * [데이터 가공 및 캐시 제어 전략]
 * - `unstable_cache`를 활용하여 전역 뱃지 리스트(ID 오름차순 정렬) 서버 사이드 캐시 적용
 * - 모든 사용자가 동일하게 참조하는 정적 데이터로서 24시간(`86400`) 단위 리밸리데이션(Revalidate) 유지
 */
export const getAllBadges = nextCache(
  async () => {
    return await db.badge.findMany({
      select: { id: true, name: true, icon: true, description: true },
      orderBy: { id: "asc" },
    });
  },
  ["badges-all"],
  { tags: [T.BADGES_ALL()], revalidate: 86400 } // 24시간 캐시 유지
);

/**
 * 특정 유저의 보유 뱃지 목록 조회 로직
 *
 * [데이터 가공 전략]
 * - 유저 정보에 조인된 획득 뱃지(`badges`) 배열 데이터만 순수하게 추출하여 반환
 * - 클라이언트 TanStack Query 캐시와 연동하기 위한 순수 함수 형태 제공
 *
 * @param {number} userId - 조회할 유저 ID
 * @returns {Promise<Badge[]>} 획득한 뱃지 배열 반환
 */
export async function getUserBadges(userId: number): Promise<Badge[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      badges: {
        select: { id: true, name: true, icon: true, description: true },
        orderBy: { id: "asc" },
      },
    },
  });
  return user?.badges ?? [];
}

// -----------------------------------------------------------------------------
// 2. 부여 (Award)
// -----------------------------------------------------------------------------

/**
 * 유저 뱃지 부여 및 알림 발송 통합 로직
 *
 * [데이터 가공 및 알림 제어 전략]
 * - 뱃지 메타데이터 조회 및 유저의 해당 뱃지 중복 보유 여부 사전 검증
 * - DB 업데이트를 통한 뱃지 매핑(Connect) 처리
 * - 유저의 알림 수신 설정(`NotificationPreferences`) 확인 후 앱 내 브로드캐스트(In-App) 및 푸시 알림 비동기 병렬 발송
 *
 * @param {number} userId - 대상 유저 ID
 * @param {string} badgeName - 부여할 뱃지 식별자 코드
 */
async function awardBadge(userId: number, badgeName: string) {
  try {
    const badge = await db.badge.findFirst({
      where: { name: badgeName },
      select: { id: true, icon: true, name: true },
    });
    if (!badge?.id) return;

    const hasBadge = await db.user.count({
      where: { id: userId, badges: { some: { id: badge.id } } },
    });
    if (hasBadge > 0) return;

    // 1) 배지 부여
    await db.user.update({
      where: { id: userId },
      data: { badges: { connect: { id: badge.id } } },
    });

    // 2) 알림 설정 조회
    const pref = await db.notificationPreferences.findUnique({
      where: { userId },
    });

    if (pref && !isNotificationTypeEnabled(pref, "BADGE")) {
      return;
    }

    const imageUrl = badge.icon ? `${badge.icon}/public` : undefined;

    // 3) Notification DB 저장
    const notification = await db.notification.create({
      data: {
        userId,
        title: "새로운 뱃지 획득!",
        body: `축하합니다! "${getBadgeKoreanName(
          badgeName
        )}" 뱃지를 획득하셨습니다!`,
        type: "BADGE",
        link: "/profile",
        image: imageUrl,
        isPushSent: false,
      },
    });

    // 4) Broadcast (In-App)
    await supabase.channel(`user-${userId}-notifications`).send({
      type: "broadcast",
      event: "notification",
      payload: {
        id: notification.id,
        userId,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        type: notification.type,
        image: notification.image,
        created_at: notification.created_at,
      },
    });

    // 5) Push Notification
    if (!canSendPushForType(pref, "BADGE")) return;

    try {
      const result = await sendPushNotification({
        targetUserId: userId,
        title: notification.title,
        message: notification.body,
        url: notification.link ?? undefined,
        type: "BADGE",
        image: notification.image ?? undefined,
        tag: `bp-badge-${badgeName.toLowerCase()}`,
        renotify: true,
      });

      if (result?.success && (result.data?.sent ?? 0) > 0) {
        await db.notification.update({
          where: { id: notification.id },
          data: { isPushSent: true, sentAt: new Date() },
        });
      }
    } catch (err) {
      console.warn("[awardBadge] push failed:", err);
    }
  } catch (error) {
    console.error(`${badgeName} 뱃지 부여 중 오류:`, error);
  }
}

// -----------------------------------------------------------------------------
// 3. 뱃지별 조건 체크 로직 (Conditions)
// -----------------------------------------------------------------------------

/**
 * [첫 거래 선원] (FIRST_DEAL)
 * - 조건: 판매 또는 구매 횟수가 1회 이상일 때
 * - 트리거: 거래 완료(Sold) 시점 (판매자/구매자 모두)
 */
export const checkFirstDealBadge = async (userId: number) => {
  try {
    const tradeCount = await db.product.count({
      where: {
        OR: [
          { userId, purchase_userId: { not: null } },
          { purchase_userId: userId },
        ],
      },
    });
    if (tradeCount >= 1) await awardBadge(userId, "FIRST_DEAL");
  } catch (e) {
    console.error("FIRST_DEAL check error:", e);
  }
};

/**
 * [노련한 상인] (POWER_SELLER)
 * - 조건: 판매 완료 10건 이상 AND 평균 평점 4.0 이상
 * - 트리거: 거래 완료(Seller), 리뷰 작성됨(Seller)
 */
export const checkPowerSellerBadge = async (userId: number) => {
  try {
    const [salesCount, averageRating] = await Promise.all([
      db.product.count({
        where: { userId, purchase_userId: { not: null } },
      }),
      calculateAverageRating(userId),
    ]);
    if (salesCount >= 10 && averageRating >= 4.0) {
      await awardBadge(userId, "POWER_SELLER");
    }
  } catch (e) {
    console.error("POWER_SELLER check error:", e);
  }
};

/**
 * [신속한 교신병] (QUICK_RESPONSE)
 * - 조건: (최근 60일 기준) 총 메시지 50개 이상 AND 응답률 80% 이상 AND 평균 응답 시간 60분 이내
 * - 트리거: 메시지 전송 시점
 */
export const checkQuickResponseBadge = async (userId: number) => {
  try {
    const res = await calculateChatResponseRate(userId);
    if (res.totalMessages >= 50 && res.rate >= 80 && res.averageTime <= 60) {
      await awardBadge(userId, "QUICK_RESPONSE");
    }
  } catch (e) {
    console.error("QUICK_RESPONSE check error:", e);
  }
};

/**
 * [첫 항해일지] (FIRST_POST)
 * - 조건: 게시글(Post) 1개 이상 작성
 * - 트리거: 게시글 작성 시점
 */
export const checkFirstPostBadge = async (userId: number) => {
  try {
    const count = await db.post.count({ where: { userId } });
    if (count >= 1) await awardBadge(userId, "FIRST_POST");
  } catch (e) {
    console.error("FIRST_POST check error:", e);
  }
};

/**
 * [인기 항해사] (POPULAR_WRITER)
 * - 조건: (최근 6개월) 게시글 5개 이상 AND 받은 좋아요 총합 50개 이상
 * - 트리거: 게시글 작성, 좋아요 받음
 */
export const checkPopularWriterBadge = async (userId: number) => {
  try {
    const since = new Date();
    since.setMonth(since.getMonth() - 6);
    const posts = await db.post.findMany({
      where: { userId, created_at: { gte: since } },
      include: { post_likes: true },
    });
    const totalLikes = posts.reduce((sum, p) => sum + p.post_likes.length, 0);
    if (posts.length >= 5 && totalLikes >= 50) {
      await awardBadge(userId, "POPULAR_WRITER");
    }
  } catch (e) {
    console.error("POPULAR_WRITER check error:", e);
  }
};

/**
 * [열정적인 통신사] (ACTIVE_COMMENTER)
 * - 조건: (최근 30일) 댓글 30개 이상 작성 AND 그 중 '보물지도/항해일지' 카테고리 비율 30% 이상
 * - 트리거: 댓글 작성 시점
 */
export const checkActiveCommenterBadge = async (userId: number) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const comments = await db.comment.findMany({
      where: { userId, created_at: { gte: since } },
      include: { post: true },
    });
    const helpful = comments.filter(
      (c) => c.post.category === "MAP" || c.post.category === "LOG"
    );
    if (comments.length >= 30 && helpful.length / comments.length >= 0.3) {
      await awardBadge(userId, "ACTIVE_COMMENTER");
    }
  } catch (e) {
    console.error("ACTIVE_COMMENTER check error:", e);
  }
};

/**
 * [규칙의 현자] (RULE_SAGE)
 * - 조건: '보물지도(MAP)' 카테고리 게시글 10개 이상 AND 해당 글들의 총 조회수 500회 이상
 * - 트리거: 게시글 작성 시점 (조회수 증가는 별도 크론잡으로 체크 권장)
 */
export const checkRuleSageBadge = async (userId: number) => {
  try {
    const rulePosts = await db.post.findMany({
      where: { userId, category: "MAP" },
    });
    if (rulePosts.length >= 10) {
      const totalViews = rulePosts.reduce((sum, p) => sum + p.views, 0);
      if (totalViews >= 500) await awardBadge(userId, "RULE_SAGE");
    }
  } catch (e) {
    console.error("RULE_SAGE check error:", e);
  }
};

/**
 * [보물선 수집가] (GAME_COLLECTOR)
 * - 조건: 거래(판매/구매) 총 20회 이상 AND 카테고리 3종류 이상 AND 게임 타입 2종류 이상
 * - 트리거: 거래 완료(Sold), 상품 등록(Add)
 */
export const checkGameCollectorBadge = async (userId: number) => {
  try {
    const trades = await db.product.findMany({
      where: {
        OR: [
          { userId, purchase_userId: { not: null } },
          { purchase_userId: userId },
        ],
      },
      select: { categoryId: true, game_type: true },
    });
    if (trades.length === 0) return;

    const catSet = new Set(trades.map((t) => t.categoryId));
    const typeSet = new Set(trades.map((t) => t.game_type).filter(Boolean));

    if (trades.length >= 20 && catSet.size >= 3 && typeSet.size >= 2) {
      await awardBadge(userId, "GAME_COLLECTOR");
    }
  } catch (e) {
    console.error("GAME_COLLECTOR check error:", e);
  }
};

/**
 * [장르의 항해사] (GENRE_MASTER)
 * - 조건: 특정 카테고리 거래 10회 이상 AND 해당 카테고리 거래 평점 4.4 이상
 * - 트리거: 거래 완료, 리뷰 작성, 상품 등록
 */
export const checkGenreMasterBadge = async (userId: number) => {
  try {
    const trades = await db.product.findMany({
      where: {
        OR: [
          { userId, purchase_userId: { not: null } },
          { purchase_userId: userId },
        ],
      },
      select: { categoryId: true },
    });
    const counts: Record<number, number> = {};
    trades.forEach((t) => {
      counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
    });

    const candidates = Object.entries(counts)
      .filter(([, c]) => c >= 10)
      .map(([id]) => Number(id));

    if (candidates.length === 0) return;

    const ratings = await Promise.all(
      candidates.map((cid) => calculateCategoryRating(userId, cid))
    );
    if (ratings.some((r) => r >= 4.4)) {
      await awardBadge(userId, "GENRE_MASTER");
    }
  } catch (e) {
    console.error("GENRE_MASTER check error:", e);
  }
};

/**
 * [보드게임 탐험가] (BOARD_EXPLORER)
 * - 조건: 게임 타입 4종류 이상 거래 AND (MAP/LOG) 게시글 7개 이상 AND 인기 지수(Popularity) 달성
 * - 트리거: 크론잡(Rolling Batch)으로 체크
 */
export const checkBoardExplorerBadge = async (userId: number) => {
  try {
    const [trades, reviews, popularity] = await Promise.all([
      db.product.findMany({
        where: {
          OR: [
            { userId, purchase_userId: { not: null } },
            { purchase_userId: userId },
          ],
        },
        select: { game_type: true },
      }),
      db.post.count({
        where: { userId, OR: [{ category: "MAP" }, { category: "LOG" }] },
      }),
      isPopularity(userId),
    ]);
    const types = new Set(trades.map((t) => t.game_type));
    if (types.size >= 4 && reviews >= 7 && popularity === 1) {
      await awardBadge(userId, "BOARD_EXPLORER");
    }
  } catch (e) {
    console.error("BOARD_EXPLORER check error:", e);
  }
};

/**
 * [인증된 선원] (VERIFIED_SAILOR)
 * - 조건: 이메일 인증 AND 전화번호 인증 모두 완료
 * - 트리거: 이메일/SMS 인증 완료 시점
 */
export const checkVerifiedSailorBadge = async (userId: number) => {
  try {
    const u = await db.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, emailVerified: true },
    });
    // 이메일 필드가 있고 인증되었으며, 전화번호도 있어야 함
    if (u?.phone && u?.email && u.emailVerified) {
      await awardBadge(userId, "VERIFIED_SAILOR");
    }
  } catch (e) {
    console.error("VERIFIED_SAILOR check error:", e);
  }
};

/**
 * [정직한 상인] (FAIR_TRADER)
 * - 조건: 거래 5회 이상 AND 평균 평점 4.5 이상
 * - 트리거: 거래 완료, 리뷰 작성됨
 */
export const checkFairTraderBadge = async (userId: number) => {
  try {
    const [count, rating] = await Promise.all([
      db.product.count({
        where: {
          OR: [
            { userId, purchase_userId: { not: null } },
            { purchase_userId: userId },
          ],
        },
      }),
      calculateAverageRating(userId),
    ]);
    if (count >= 5 && rating >= 4.5) {
      await awardBadge(userId, "FAIR_TRADER");
    }
  } catch (e) {
    console.error("FAIR_TRADER check error:", e);
  }
};

/**
 * [품질의 달인] (QUALITY_MASTER)
 * - 조건: 판매 8회 이상 AND 판매품 중 '새상품/거의새것' & '완벽 구성' 비율이 70% 이상
 * - 트리거: 거래 완료(Sold)
 */
export const checkQualityMasterBadge = async (userId: number) => {
  try {
    const products = await db.product.findMany({
      where: { userId, purchase_userId: { not: null } },
      select: { condition: true, completeness: true },
    });
    if (products.length >= 8) {
      const highQuality = products.filter(
        (p) =>
          (p.condition === "NEW" || p.condition === "LIKE_NEW") &&
          p.completeness === "COMPLETE"
      );
      if (highQuality.length / products.length >= 0.7) {
        await awardBadge(userId, "QUALITY_MASTER");
      }
    }
  } catch (e) {
    console.error("QUALITY_MASTER check error:", e);
  }
};

/**
 * [첫 항해 선원] (EARLY_SAILOR)
 * - 조건: 2025-01-01 이전 가입 AND (게시글 1개 이상 OR 댓글 1개 이상)
 * - 트리거: 게시글/댓글 작성 시점 (이벤트 참여)
 */
export const checkEarlySailorBadge = async (userId: number) => {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { posts: true, comments: true },
    });
    if (!user) return;
    const deadline = new Date("2025-01-01");
    if (
      user.created_at < deadline &&
      (user.posts.length > 0 || user.comments.length > 0)
    ) {
      await awardBadge(userId, "EARLY_SAILOR");
    }
  } catch (e) {
    console.error("EARLY_SAILOR check error:", e);
  }
};

/**
 * [항구 축제의 주인] (PORT_FESTIVAL)
 * - 조건: (최근 한 달) 게시글 3개 이상 AND 댓글 10개 이상 AND 거래 1회 이상
 * - 트리거: 크론잡(Rolling Batch)으로 체크
 */
export const checkPortFestivalBadge = async (userId: number) => {
  try {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const [posts, comments, trades] = await Promise.all([
      db.post.count({ where: { userId, created_at: { gte: lastMonth } } }),
      db.comment.count({ where: { userId, created_at: { gte: lastMonth } } }),
      db.product.count({
        where: {
          userId,
          purchase_userId: { not: null },
          created_at: { gte: lastMonth },
        },
      }),
    ]);
    if (posts >= 3 && comments >= 10 && trades >= 1) {
      await awardBadge(userId, "PORT_FESTIVAL");
    }
  } catch (e) {
    console.error("PORT_FESTIVAL check error:", e);
  }
};

/**
 * 사용자 행동 기반 뱃지 획득 여부 비동기 검사 래퍼 객체
 *
 * [동작 전략]
 * - 거래 완료, 게시글 작성, 댓글 작성 등 특정 이벤트 발생 후 호출되어 연관된 여러 뱃지 검사 함수를 병렬(Promise.all) 실행 처리
 */
export const badgeChecks = {
  onTradeComplete: async (userId: number, role: "seller" | "buyer") => {
    if (role === "seller") {
      await Promise.all([
        checkFirstDealBadge(userId),
        checkPowerSellerBadge(userId),
        checkQualityMasterBadge(userId),
        checkFairTraderBadge(userId),
        checkGenreMasterBadge(userId),
        checkGameCollectorBadge(userId),
      ]);
    } else {
      await Promise.all([
        checkGameCollectorBadge(userId),
        checkFairTraderBadge(userId),
      ]);
    }
  },
  onPostCreate: async (userId: number) => {
    await Promise.all([
      checkFirstPostBadge(userId),
      checkPopularWriterBadge(userId),
    ]);
  },
  onCommentCreate: async (userId: number) => {
    await checkActiveCommenterBadge(userId);
  },
  onChatResponse: async (userId: number) => {
    await checkQuickResponseBadge(userId);
  },
  onVerificationUpdate: async (userId: number) => {
    await checkVerifiedSailorBadge(userId);
  },
  onEventParticipation: async (userId: number) => {
    await checkEarlySailorBadge(userId);
  },
  onReviewComplete: async (userId: number, reviewType: "buyer" | "seller") => {
    if (reviewType === "buyer") {
      // 구매자가 남김 -> 판매자(userId) 체크
      await Promise.all([
        checkPowerSellerBadge(userId),
        checkGenreMasterBadge(userId),
        checkFairTraderBadge(userId),
      ]);
    } else {
      // 판매자가 남김 -> 구매자(userId) 체크
      await checkFairTraderBadge(userId);
    }
  },
  onProductAdd: async (userId: number) => {
    await Promise.all([
      checkGameCollectorBadge(userId),
      checkGenreMasterBadge(userId),
    ]);
  },
};
