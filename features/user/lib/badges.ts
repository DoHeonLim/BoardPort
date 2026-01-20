/**
 * File Name : features/user/lib/badges.ts
 * Description : 뱃지 조건 체크 및 부여 함수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.23  임도헌   Created
 * 2024.12.24  임도헌   Modified  뱃지 체크 조건 함수 추가
 * 2025.01.12  임도헌   Modified  뱃지 획득시 이미지 보이게 변경
 * 2025.03.02  임도헌   Modified  checkRuleSageBadge를 onPostCreate에서 제거
 * 2025.03.29  임도헌   Modified  checkBoardExplorer함수 로직 변경
 * 2025.04.10  임도헌   Modified  인증된 선원 뱃지 간소화
 * 2025.04.13  임도헌   Modified  구성품 관리자를 품질의 달인으로 변경, 조건 수정
 * 2025.11.11  임도헌   Modified  awardBadge함수 구조 개선
 * 2025.12.07  임도헌   Modified  뱃지 조건/기획 튜닝(응답/커뮤니티/전문성/신뢰도)
 * 2025.12.21  임도헌   Modified  정책 적용(설정 OFF면 알림 row 생성 X),
 *                                푸시 sent>0일 때만 isPushSent/sentAt 갱신, quietHours 반영
 * 2025.12.31  임도헌   Modified  GENRE_MASTER(전문성)/GAME_COLLECTOR(다양성) 주석 정합성 고정,
 *                                checkGenreMasterBadge 최적화(select 최소화, 후보 카테고리 제한, rating 병렬 계산),
 *                                badgeChecks.onTradeComplete(role) 도입으로 seller/buyer 체크 분리
 * 2026.01.19  임도헌   Moved     lib/user -> features/user/lib
 * 2026.01.19  임도헌   Renamed   check-badge-conditions.ts -> badges.ts
 */

import db from "@/lib/db";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import {
  calculateAverageRating,
  calculateCategoryRating,
  calculateChatResponseRate,
  isPopularity,
} from "@/features/user/lib/metrics";
import { supabase } from "@/lib/supabase";
import { getBadgeKoreanName } from "@/lib/utils";
import { sendPushNotification } from "@/features/notification/lib/push-notification";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/lib/policy";

/**
 * 뱃지 부여 함수
 * - 새로운 뱃지 획득 시 사용자에게 부여(뱃지 connect)는 항상 수행
 * - 알림/푸시는 NotificationPreferences 정책에 따라 best-effort로 수행
 *
 * 정책
 * - BADGE 타입 OFF면 Notification row 자체를 생성하지 않음(앱 내 + 푸시 모두 OFF)
 * - 푸시 성공 판정은 sent>0일 때만 isPushSent/sentAt 갱신
 *
 * 캐시
 * - 뱃지 획득 직후 user-badges-id-${userId}는 항상 무효화(best-effort)
 *   (호출자에서 누락해도 UI가 늦게 갱신되는 문제를 예방)
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

    // 1) 배지 부여(핵심 비즈니스) — 알림 설정과 무관하게 항상 수행
    await db.user.update({
      where: { id: userId },
      data: { badges: { connect: { id: badge.id } } },
    });

    // 1-1) 배지 UI 캐시 무효화는 awardBadge 내부에서 항상 수행(best-effort)
    try {
      revalidateTag(T.USER_BADGES_ID(userId));
    } catch (e) {
      // revalidateTag 호출이 불가능한 환경(극히 예외)이어도 배지 부여는 성공해야 함
      console.warn("[awardBadge] revalidateTag failed:", e);
    }

    // 2) 알림 설정 조회
    const prefs = await db.notificationPreferences.findUnique({
      where: { userId },
    });

    // 타입 OFF면 알림 row 생성 자체를 하지 않는다.
    if (prefs && !isNotificationTypeEnabled(prefs, "BADGE")) {
      return;
    }

    const imageUrl = badge.icon ? `${badge.icon}/public` : undefined;

    // 3) Notification row 생성
    const notification = await db.notification.create({
      data: {
        userId,
        title: "새로운 뱃지 획득!",
        body: `축하합니다! "${getBadgeKoreanName(badgeName)}" 뱃지를 획득하셨습니다!`,
        type: "BADGE",
        link: "/profile",
        image: imageUrl,
        isPushSent: false,
      },
    });

    // 4) 실시간 브로드캐스트(유저 전용 채널)
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

    // 5) 푸시(quietHours 포함)
    if (!canSendPushForType(prefs, "BADGE")) return;

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

      const sent = (result as any)?.sent ?? 0;
      if (result?.success && sent > 0) {
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

// 1. 거래 관련 뱃지들
/**
 * 첫 거래 선원 뱃지 체크 함수
 * - 조건: 첫 거래 완료 (판매 또는 구매)
 * - 호출 시점:
 *   1. 제품 거래가 완료될 때
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

    // 첫 거래가 완료되었다면 뱃지 부여
    if (tradeCount === 1) {
      await awardBadge(userId, "FIRST_DEAL");
    }
  } catch (error) {
    console.error("FIRST_DEAL 뱃지 체크 중 오류:", error);
  }
};

/**
 * 노련한 상인 뱃지 체크 함수
 * - 조건:
 *   1. 10회 이상 거래 완료
 *   2. 평균 평점 4.0 이상
 * - 호출 시점:
 *   1. 거래가 완료될 때
 *   2. 판매자 평가가 등록될 때
 */
export const checkPowerSellerBadge = async (userId: number) => {
  try {
    const [salesCount, averageRating] = await Promise.all([
      db.product.count({
        where: {
          userId,
          purchase_userId: { not: null },
        },
      }),
      calculateAverageRating(userId),
    ]);

    if (salesCount >= 10 && averageRating >= 4.0) {
      await awardBadge(userId, "POWER_SELLER");
    }
  } catch (error) {
    console.error("POWER_SELLER 뱃지 체크 중 오류:", error);
  }
};

/**
 * 신속한 교신병 뱃지 체크 함수
 * - 조건:
 *   1. 최근 60일 기준, 내가 보낸 채팅 메시지 50개 이상
 *   2. 채팅 응답률 80% 이상
 *   3. 평균 응답 시간 60분 이내
 *   ※ calculateChatResponseRate는 최근 60일 이내 채팅 기준
 * - 호출 시점:
 *   1. 채팅 메시지 응답 시
 *   2. 주기적인 채팅 통계 업데이트 시
 */
export const checkQuickResponseBadge = async (userId: number) => {
  try {
    const chatResponses = await calculateChatResponseRate(userId);
    if (
      chatResponses.totalMessages >= 50 &&
      chatResponses.rate >= 80 &&
      chatResponses.averageTime <= 60
    ) {
      await awardBadge(userId, "QUICK_RESPONSE");
    }
  } catch (error) {
    console.error("QUICK_RESPONSE 뱃지 체크 중 오류:", error);
  }
};

// 2. 커뮤니티 활동 뱃지들
/**
 * 첫 항해일지 뱃지 체크 함수
 * - 조건: 첫 게시글 작성
 * - 호출 시점:
 *   1. 게시글 작성 완료 시
 */
export const checkFirstPostBadge = async (userId: number) => {
  try {
    const postCount = await db.post.count({ where: { userId } });
    if (postCount >= 1) {
      await awardBadge(userId, "FIRST_POST");
    }
  } catch (error) {
    console.error("FIRST_POST 뱃지 체크 중 오류:", error);
  }
};

/**
 * 인기 항해사 뱃지 체크 함수
 * - 조건(최근 6개월 기준):
 *   1. 게시글 5개 이상
 *   2. 총 좋아요 50개 이상
 * - 호출 시점:
 *   1. 게시글 작성 시
 *   2. 게시글에 좋아요가 추가될 때
 */
export const checkPopularWriterBadge = async (userId: number) => {
  try {
    const since = new Date();
    since.setMonth(since.getMonth() - 6); // 최근 6개월

    const posts = await db.post.findMany({
      where: {
        userId,
        created_at: {
          gte: since,
        },
      },
      include: { post_likes: true },
    });

    const totalLikes = posts.reduce(
      (sum, post) => sum + post.post_likes.length,
      0
    );

    if (posts.length >= 5 && totalLikes >= 50) {
      await awardBadge(userId, "POPULAR_WRITER");
    }
  } catch (error) {
    console.error("POPULAR_WRITER 뱃지 체크 중 오류:", error);
  }
};

/**
 * 열정적인 통신사 뱃지 체크 함수
 * - 조건:
 *   1. 최근 30일 내 댓글 30개 이상
 *   2. 규칙/후기 게시글 댓글 비율 30% 이상
 * - 호출 시점:
 *   1. 댓글 작성 시
 */
export const checkActiveCommenterBadge = async (userId: number) => {
  try {
    const comments = await db.comment.findMany({
      where: {
        userId,
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      include: { post: true },
    });

    const helpfulComments = comments.filter(
      (comment) =>
        comment.post.category === "MAP" || comment.post.category === "LOG"
    );

    if (
      comments.length >= 30 &&
      helpfulComments.length / comments.length >= 0.3
    ) {
      await awardBadge(userId, "ACTIVE_COMMENTER");
    }
  } catch (error) {
    console.error("ACTIVE_COMMENTER 뱃지 체크 중 오류:", error);
  }
};

/**
 * 규칙의 현자 뱃지 체크 함수
 * - 조건:
 *   1. 규칙 설명 게시글 10개 이상
 *   2. 규칙 설명 게시글의 총 조회수 500회 이상
 * - 호출 시점:
 *   1. 규칙 설명 게시글 작성 시
 *   2. 게시글 조회수 업데이트 시
 */
export const checkRuleSageBadge = async (userId: number) => {
  try {
    const rulePosts = await db.post.findMany({
      where: {
        userId,
        category: "MAP",
      },
    });

    if (rulePosts.length >= 10) {
      const totalViews = rulePosts.reduce((sum, post) => sum + post.views, 0);
      if (totalViews >= 500) {
        await awardBadge(userId, "RULE_SAGE");
      }
    }
  } catch (error) {
    console.error("RULE_SAGE 뱃지 체크 중 오류:", error);
  }
};

// 3. 거래 다양성(폭) 뱃지
/**
 * 보물선 수집가 뱃지 체크 함수
 * - 조건:
 *   1. 완료된 거래(판매자/구매자 합산) 20회 이상
 *   2. 서로 다른 categoryId 3개 이상
 *   3. 서로 다른 game_type 2종 이상 (예: 보드게임 + TRPG)
 *
 * - 완료된 거래 정의:
 *   - 내가 판매자이면서 purchase_userId가 not null 인 제품
 *   - 내가 구매자인 제품(purchase_userId === userId)
 *
 * - 호출 시점:
 *   1. 거래 완료 시 (onTradeComplete)
 *   2. (옵션) 다른 액션에서 재검증용으로 호출 가능
 */
export const checkGameCollectorBadge = async (userId: number) => {
  try {
    const trades = await db.product.findMany({
      where: {
        OR: [
          {
            userId,
            purchase_userId: { not: null }, // 내가 판매한 완료 거래
          },
          {
            purchase_userId: userId, // 내가 구매한 거래
          },
        ],
      },
      select: {
        categoryId: true,
        game_type: true,
      },
    });

    if (trades.length === 0) return;

    const categorySet = new Set<number>();
    const gameTypeSet = new Set<string>();

    for (const trade of trades) {
      categorySet.add(trade.categoryId);
      // game_type이 string 필드라서 null 될 일은 없겠지만 방어 코드 한 줄 정도는 괜찮을듯
      if (trade.game_type) {
        gameTypeSet.add(trade.game_type);
      }
    }

    const totalCompletedTrades = trades.length;
    const distinctCategories = categorySet.size;
    const distinctGameTypes = gameTypeSet.size;

    if (
      totalCompletedTrades >= 20 &&
      distinctCategories >= 3 &&
      distinctGameTypes >= 2
    ) {
      await awardBadge(userId, "GAME_COLLECTOR");
    }
  } catch (error) {
    console.error("GAME_COLLECTOR 뱃지 체크 중 오류:", error);
  }
};
/**
 * 장르의 항해사(전문성) 뱃지 체크 함수 (GENRE_MASTER)
 * - 컨셉: "다양성"이 아니라 **특정 카테고리에서 거래 경험이 누적되고 평점까지 높은 유저**를 의미.
 *
 * - 조건:
 *   1. 특정 카테고리에서 완료 거래(판매/구매 합산) 10회 이상
 *   2. 해당 카테고리 평점 4.4 이상 (리뷰 기반)
 *
 * - 완료 거래 정의:
 *   - 내가 판매자이면서 purchase_userId가 not null 인 제품
 *   - 내가 구매자인 제품(purchase_userId === userId)
 *
 * - 구현 메모(성능):
 *   - 전체 trade를 가져오지 않고 categoryId만 select
 *   - 조건(10회 이상)을 만족하는 카테고리만 rating 계산
 *   - 후보가 많을 수 있으므로 count 기준 상위 N개만 평가(기본 5개)
 *
 * - 호출 시점:
 *   1. 거래 완료 시(조건 1 누적)
 *   2. 평가(리뷰) 등록 시(조건 2 갱신)
 */
export const checkGenreMasterBadge = async (userId: number) => {
  try {
    /**
     * NOTE:
     * - 거래 데이터는 categoryId만 필요하므로 select로 최소화한다.
     * - 카테고리별 거래 횟수를 계산한 뒤, 10회 이상인 후보 카테고리만 평점 계산을 수행한다.
     */
    const trades = await db.product.findMany({
      where: {
        OR: [
          {
            userId,
            purchase_userId: { not: null }, // 내가 판매자이며 판매가 완료된 제품
          },
          { purchase_userId: userId }, // 내가 구매자인 제품
        ],
      },
      select: { categoryId: true },
    });

    // 카테고리별 거래 횟수 집계
    const categoryCounts = trades.reduce(
      (acc, trade) => {
        const categoryId = trade.categoryId;
        acc[categoryId] = (acc[categoryId] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );

    // 조건(10회 이상)을 만족하는 후보만 추출 (count 높은 순으로 제한)
    const candidateCategoryIds = Object.entries(categoryCounts)
      .filter(([, count]) => count >= 10)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // 후보가 과도하게 많아지는 상황 방지 (필요 시 조정)
      .map(([categoryId]) => Number(categoryId));

    if (candidateCategoryIds.length === 0) return;

    // 후보 카테고리 평점을 병렬 계산
    const ratings = await Promise.all(
      candidateCategoryIds.map(async (categoryId) => {
        const rating = await calculateCategoryRating(userId, categoryId);
        return { categoryId, rating };
      })
    );

    const hasQualifiedCategory = ratings.some((r) => r.rating >= 4.4);
    if (hasQualifiedCategory) {
      await awardBadge(userId, "GENRE_MASTER");
    }
  } catch (error) {
    console.error("GENRE_MASTER 뱃지 체크 중 오류:", { userId, error });
  }
};

/**
 * 보드게임 탐험가 뱃지 체크 함수
 * - 조건:
 *   1. 4가지 이상의 게임 타입 거래
 *   2. 보물지도(공략), 항해 일지(후기) 게시글 7개 이상
 *   3. 커뮤니티 인기도 체크(최근 6개월 MAP/LOG 기준, 댓글 10개 AND 좋아요 30개)
 * - 호출 시점:
 *   1. 거래 완료 시(조건 1)
 *   2. 후기(보물지도/MAP 및 항해 일지/LOG) 작성 시(조건 2)
 *   3. 평가 등록 시(조건 3) - 좋아요, 댓글
 */
export const checkBoardExplorerBadge = async (userId: number) => {
  try {
    const [trades, reviews, isPopularityUser] = await Promise.all([
      // 유저가 거래한 제품
      db.product.findMany({
        where: {
          OR: [
            {
              userId,
              purchase_userId: { not: null }, // 판매가 완료된 제품만
            },
            { purchase_userId: userId }, // 사용자가 구매한 제품
          ],
        },
        select: { game_type: true },
      }),
      // MAP/LOG 게시글 수
      db.post.count({
        where: {
          userId,
          OR: [
            { category: "MAP" }, // 보물지도 (규칙 설명/공략)
            { category: "LOG" }, // 항해 일지 (게임 후기/리뷰)
          ],
        },
      }),
      // 활동성 평가(최근 6개월, MAP/LOG 기반 인기도)
      isPopularity(userId),
    ]);

    const gameTypes = new Set(trades.map((trade) => trade.game_type));
    if (gameTypes.size >= 4 && reviews >= 7 && isPopularityUser === 1) {
      await awardBadge(userId, "BOARD_EXPLORER");
    }
  } catch (error) {
    console.error("BOARD_EXPLORER 뱃지 체크 중 오류:", error);
  }
};

// 4. 신뢰도 뱃지들
/**
 * 인증된 선원 뱃지 체크 함수
 * - 조건: 전화번호 + 이메일 인증 완료
 * - 호출 시점:
 *   1. 전화번호 인증 완료 시
 *   2. 이메일 인증 완료 시
 */
export const checkVerifiedSailorBadge = async (userId: number) => {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, email: true },
    });
    if (!user) return;
    if (user.phone && user.email) {
      await awardBadge(userId, "VERIFIED_SAILOR");
    }
  } catch (error) {
    console.error("VERIFIED_SAILOR 뱃지 체크 중 오류:", error);
  }
};

/**
 * 공정한 거래자 뱃지 체크 함수
 * - 조건:
 *   1. 5회 이상 거래 완료
 *   2. 평균 평점 4.5 이상
 * - 설명: 정직한 거래로 높은 신뢰도를 쌓은 상인
 * - 호출 시점:
 *   1. 거래 완료 시(조건 1)
 *   2. 평가 등록 시(조건 2)
 */
export const checkFairTraderBadge = async (userId: number) => {
  try {
    const [completedTrades, averageRating] = await Promise.all([
      // 완료된 거래 수
      db.product.count({
        where: {
          OR: [
            {
              userId,
              purchase_userId: { not: null }, // 판매가 완료된 제품만
            },
            { purchase_userId: userId }, // 사용자가 구매한 제품
          ],
        },
      }),
      // 평균 평점
      calculateAverageRating(userId),
    ]);

    if (completedTrades >= 5 && averageRating >= 4.5) {
      await awardBadge(userId, "FAIR_TRADER");
    }
  } catch (error) {
    console.error("FAIR_TRADER 뱃지 체크 중 오류:", error);
  }
};

/**
 * 품질의 달인 체크 함수
 * - 조건:
 *   1. 8회 이상 판매 완료
 *   2. 그 중 70% 이상의 거래가
 *      - '새제품급' 또는 '거의 새것' 상태 (제품 상태)
 *      - '완벽' 상태 (구성품 상태)
 * - 호출 시점:
 *   1. 거래 완료 시
 */
export const checkQualityMasterBadge = async (userId: number) => {
  try {
    const products = await db.product.findMany({
      where: {
        userId,
        purchase_userId: { not: null },
      },
      select: {
        condition: true,
        completeness: true,
      },
    });

    if (products.length >= 8) {
      const qualityProducts = products.filter(
        (product) =>
          (product.condition === "NEW" || product.condition === "LIKE_NEW") &&
          product.completeness === "COMPLETE"
      );

      if (qualityProducts.length / products.length >= 0.7) {
        await awardBadge(userId, "QUALITY_MASTER");
      }
    }
  } catch (error) {
    console.error("QUALITY_MASTER 뱃지 체크 중 오류:", error);
  }
};

// 5. 특별 이벤트 뱃지들
/**
 * 첫 항해 선원 뱃지 체크 함수
 * - 조건:
 *   1. 2025년 1월 1일 이전 가입
 *   2. 최소 1개 이상의 게시글 또는 댓글
 * - 호출 시점:
 *   1. 게시글 작성 시
 *   2. 댓글 작성 시
 */
export const checkEarlySailorBadge = async (userId: number) => {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        posts: true,
        comments: true,
      },
    });

    if (!user) return;

    const registrationDate = user.created_at;
    const earlyAdopterDate = new Date("2025-01-01");

    if (
      registrationDate < earlyAdopterDate &&
      (user.posts.length > 0 || user.comments.length > 0)
    ) {
      await awardBadge(userId, "EARLY_SAILOR");
    }
  } catch (error) {
    console.error("EARLY_SAILOR 뱃지 체크 중 오류:", error);
  }
};

/**
 * 항구 축제 뱃지 체크 함수
 * - 조건: 최근 30일 내
 *   1. 게시글 3개 이상
 *   2. 댓글 10개 이상
 *   3. 거래 1회 이상(판매 기준)
 * - 호출 시점:
 *   1. 게시글/댓글 작성 시
 *   2. 거래 완료 시
 *   3. 정기적인 뱃지 체크 시 (30일 기준)
 */
export const checkPortFestivalBadge = async (userId: number) => {
  try {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const [postCount, commentCount, tradeCount] = await Promise.all([
      // 최근 30일 내 작성한 게시글 수
      db.post.count({
        where: {
          userId,
          created_at: {
            gte: lastMonth,
          },
        },
      }),
      // 최근 30일 내 작성한 댓글 수
      db.comment.count({
        where: {
          userId,
          created_at: {
            gte: lastMonth,
          },
        },
      }),
      // 최근 30일 내 완료된 거래 수 (판매 기준)
      db.product.count({
        where: {
          userId,
          purchase_userId: {
            not: null,
          },
          created_at: {
            gte: lastMonth,
          },
        },
      }),
    ]);

    if (postCount >= 3 && commentCount >= 10 && tradeCount >= 1) {
      await awardBadge(userId, "PORT_FESTIVAL");
    }
  } catch (error) {
    console.error("PORT_FESTIVAL 뱃지 체크 중 오류:", error);
  }
};

// 액션별 체크 함수 그룹화
export const badgeChecks = {
  /**
   * onTradeComplete
   * - 거래가 "완료(판매완료/SOLD)" 되었을 때 호출
   * - 판매자/구매자 각각의 거래 기반 뱃지를 점검
   *
   * 포함 뱃지:
   *  - FIRST_DEAL       : 첫 거래 선원 (첫 거래 완료)
   *  - POWER_SELLER     : 노련한 상인 (판매 10회 + 평균 평점 4.0 이상)
   *  - GAME_COLLECTOR   : 보물선 수집가 (거래 20회 + 카테고리/게임타입 다양성)
   *  - GENRE_MASTER     : 장르의 항해사 (특정 카테고리 10회 + 해당 카테고리 평점 4.4 이상)
   *  - QUALITY_MASTER   : 품질의 달인 (판매 8회 중 70% 이상이 고품질/완전 구성품)
   *  - FAIR_TRADER      : 공정한 거래자 (거래 5회 + 평균 평점 4.5 이상)
   *
   * 호출 시점:
   *  - 제품 상태가 판매완료(SOLD)로 전환된 직후
   *    (예: lib/product/updateProductStatus의 "sold" 분기)
   */
  onTradeComplete: async (userId: number, role: "seller" | "buyer") => {
    /**
     * 거래 완료(SOLD) 시점에 호출되는 뱃지 점검.
     * - seller / buyer 역할에 따라 "의미 있는 뱃지"만 선별하여 점검한다.
     * - (중요) buyer에게 판매자 성격의 뱃지를 점검하지 않도록 분기한다.
     */
    if (role === "seller") {
      await Promise.all([
        checkFirstDealBadge(userId),
        checkPowerSellerBadge(userId),
        checkQualityMasterBadge(userId),
        checkFairTraderBadge(userId),
        checkGenreMasterBadge(userId),
        checkGameCollectorBadge(userId),
      ]);
      return;
    }

    // buyer: 구매 활동 관점의 뱃지만 점검
    await Promise.all([
      checkGameCollectorBadge(userId),
      checkFairTraderBadge(userId),
    ]);
  },

  /**
   * onPostCreate
   * - 게시글(항해일지/보물지도 등)이 새로 작성되었을 때 호출
   * - 커뮤니티 "글" 중심 활동 뱃지를 점검
   *
   * 포함 뱃지:
   *  - FIRST_POST       : 첫 항해일지 (첫 게시글 작성)
   *  - POPULAR_WRITER   : 인기 항해사 (최근 6개월 5개 이상 글 + 총 좋아요 50개 이상)
   *
   * 호출 시점:
   *  - 게시글 생성 서버 액션 완료 직후
   *    (예: lib/post/createPost 내에서 호출)
   */
  onPostCreate: async (userId: number) => {
    await Promise.all([
      checkFirstPostBadge(userId),
      checkPopularWriterBadge(userId),
    ]);
  },

  /**
   * onCommentCreate
   * - 게시글에 댓글이 작성되었을 때 호출
   * - 커뮤니티 "댓글" 중심 활동 뱃지를 점검
   *
   * 포함 뱃지:
   *  - ACTIVE_COMMENTER : 열정적인 통신사 (최근 30일 댓글 30개 이상 + MAP/LOG 댓글 비율 30% 이상)
   *
   * 호출 시점:
   *  - 댓글 생성 서버 액션 완료 직후
   */
  onCommentCreate: async (userId: number) => {
    await checkActiveCommenterBadge(userId);
  },

  /**
   * onChatResponse
   * - 채팅방에서 응답 메시지가 발생했을 때 호출
   * - 응답률/응답 시간 기반 뱃지를 점검
   *
   * 포함 뱃지:
   *  - QUICK_RESPONSE   : 신속한 교신병 (최근 60일 기준, 내가 보낸 메시지 50개 이상 + 응답률 80% 이상 + 평균 응답시간 60분 이내)
   *
   * 호출 시점:
   *  - 채팅 응답 이벤트 처리 시 (예: 메시지 생성 시 "판매자 응답"인 경우)
   *  - 또는 주기적인 채팅 통계 업데이트 후
   */
  onChatResponse: async (userId: number) => {
    await checkQuickResponseBadge(userId);
  },

  /**
   * onVerificationUpdate
   * - 이메일/전화번호 인증 상태가 갱신되었을 때 호출
   * - 신뢰도/본인인증 관련 뱃지를 점검
   *
   * 포함 뱃지:
   *  - VERIFIED_SAILOR  : 인증된 선원 (전화번호 + 이메일 인증 완료)
   *
   * 호출 시점:
   *  - 전화번호 인증 완료 시
   *  - 이메일 인증 완료 시
   */
  onVerificationUpdate: async (userId: number) => {
    await checkVerifiedSailorBadge(userId);
  },

  /**
   * onEventParticipation
   * - 특수 이벤트/초기 유입 등 "한정 조건"을 가진 뱃지를 점검
   *
   * 포함 뱃지:
   *  - EARLY_SAILOR     : 첫 항해 선원 (2025-01-01 이전 가입 + 게시글/댓글 1개 이상)
   *  - (향후 추가 예정인 이벤트성 뱃지들도 여기서 함께 처리 가능)
   *
   * 호출 시점:
   *  - 특정 이벤트 참여 후
   *  - 마이그레이션/초기 유저 대상 일괄 체크 시
   */
  onEventParticipation: async (userId: number) => {
    await checkEarlySailorBadge(userId);
  },

  /**
   * onReviewComplete
   * - 거래 후 작성되는 리뷰(평점)가 생성/수정되었을 때 호출
   * - 평점/카테고리 기반 거래 전문성/신뢰도 뱃지를 점검
   *
   * reviewType:
   *  - "buyer"  : 구매자가 남긴 리뷰 → 판매자 기준 체크
   *  - "seller" : 판매자가 남긴 리뷰 → 구매자 기준 체크
   *
   * 포함 뱃지:
   *  - (buyer 리뷰 → 판매자 대상)
   *    - POWER_SELLER   : 노련한 상인 (판매 10회 + 평균 평점 4.0 이상)
   *    - GENRE_MASTER   : 장르의 항해사 (특정 카테고리 10회 + 해당 카테고리 평점 4.4 이상)
   *    - FAIR_TRADER    : 공정한 거래자 (거래 5회 + 평균 평점 4.5 이상)
   *
   *  - (seller 리뷰 → 구매자 대상)
   *    - GENRE_MASTER   : 장르의 항해사 (구매자로서 특정 카테고리 거래/평점 조건 충족 시)
   *
   * 호출 시점:
   *  - 리뷰 생성/수정 서버 액션 완료 직후 (예: lib/review/createReview)
   */
  onReviewComplete: async (userId: number, reviewType: "buyer" | "seller") => {
    /**
     * 리뷰 등록 시점에 호출되는 뱃지 점검.
     * - reviewType === "buyer": 구매자가 판매자에게 남긴 리뷰 → 판매자 기준
     * - reviewType === "seller": 판매자가 구매자에게 남긴 리뷰 → 구매자 기준
     */
    if (reviewType === "buyer") {
      await Promise.all([
        checkPowerSellerBadge(userId),
        checkGenreMasterBadge(userId),
        checkFairTraderBadge(userId),
      ]);
      return;
    }

    // 구매자 기준(기본): 신뢰도 계열만
    await Promise.all([checkFairTraderBadge(userId)]);
  },

  /**
   * onProductAdd
   * - 새 제품이 등록되었을 때 호출 (선택적)
   * - 거래 "잠재력"과 장르 다양성 관점의 뱃지를 사전 점검하고 싶을 때 사용
   *
   * 포함 뱃지:
   *  - GAME_COLLECTOR   : 보물선 수집가 (거래 20회 + 카테고리/게임타입 다양성)
   *  - GENRE_MASTER     : 장르의 항해사 (특정 카테고리 10회 + 해당 카테고리 평점 4.4 이상)
   *
   * 호출 시점(옵션):
   *  - 제품 등록 서버 액션 완료 직후 (현재 프로젝트에서는 필수 X)
   */
  onProductAdd: async (userId: number) => {
    await Promise.all([
      checkGameCollectorBadge(userId),
      checkGenreMasterBadge(userId),
    ]);
  },
};
