/**
 * File Name : features/user/service/metric.ts
 * Description : 유저 평점 및 통계 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.29  임도헌   Created   lib/session에서 DB 의존 함수 분리(Prisma 7 빌드 이슈 대응)
 * 2025.12.03  임도헌   Modified  메트릭 쿼리 기간 제한 추가(응답률/인기도 과부하 방지)
 * 2025.12.07  임도헌   Modified  인기도 기준 완화(BOARD_EXPLORER 기획 튜닝)
 * 2026.01.24  임도헌   Merged    getUserAverageRating, calculateChatResponseRate 등 이관
 */

import "server-only";
import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import { Prisma } from "@/generated/prisma/client";
import type { ProfileAverageRating } from "@/features/user/types";

// 평점 계산 (Cached Helper)
const _getUserAverageRatingBase = async (
  userId: number
): Promise<ProfileAverageRating> => {
  // 내가 판매한 물건에 달린 리뷰 + 내가 구매한 물건에 달린 리뷰 (상대방이 쓴 것)
  const where: Prisma.ReviewWhereInput = {
    userId: { not: userId },
    OR: [
      { product: { userId, purchase_userId: { not: null } } },
      { product: { purchase_userId: userId } },
    ],
  };

  const agg = await db.review.aggregate({
    where,
    _avg: { rate: true },
    _count: { rate: true },
  });

  const avg = Number(agg._avg.rate ?? 0);
  const clamped = Math.min(5, Math.max(0, avg));
  const rounded = Math.round(clamped * 10) / 10;

  return { averageRating: rounded, reviewCount: Number(agg._count.rate ?? 0) };
};

/**
 * 유저의 평균 평점 조회 (Cached)
 * - 프로필 헤더 등에서 사용
 */
export const getCachedUserAverageRating = (userId: number) => {
  const cached = nextCache(
    async (uid: number) => _getUserAverageRatingBase(uid),
    ["user-average-rating-by-id"],
    { tags: [T.USER_AVERAGE_RATING_ID(userId)] }
  );
  return cached(userId);
};

/**
 * [뱃지용] 평균 평점 계산
 * - 판매 완료된 제품의 리뷰 평점만 계산 (자신이 쓴 리뷰 제외)
 */
export async function calculateAverageRating(userId: number): Promise<number> {
  const reviews = await db.product.findMany({
    where: {
      userId,
      purchase_userId: { not: null }, // 판매 완료된 제품만
    },
    select: {
      reviews: {
        where: { userId: { not: userId } }, // 자신이 작성한 리뷰는 제외
        select: { rate: true },
      },
    },
  });

  const allRatings = reviews.flatMap((product) =>
    product.reviews.map((r) => r.rate)
  );

  if (allRatings.length === 0) return 0;

  const averageRating =
    allRatings.reduce((acc, curr) => acc + curr, 0) / allRatings.length;

  return Number(averageRating.toFixed(1));
}

/**
 * [뱃지용] 채팅 응답률 및 평균 응답 시간 계산
 * - ⚠ 최근 60일 이내 메시지만 대상으로 계산 (무한 과거 조회 방지)
 * - 응답률과 평균 응답 시간 계산
 * - 판매자/구매자로서의 모든 채팅 기록 분석
 */
export async function calculateChatResponseRate(userId: number): Promise<{
  rate: number;
  averageTime: number;
  totalMessages: number;
}> {
  const since = new Date();
  since.setDate(since.getDate() - 60); // 최근 60일

  const chatRooms = await db.productChatRoom.findMany({
    where: {
      users: { some: { id: userId } },
      // 최근 60일 안에 메시지가 한 개 이상 있는 방만
      messages: { some: { created_at: { gte: since } } },
    },
    include: {
      product: { select: { userId: true } },
      messages: {
        where: { created_at: { gte: since } },
        orderBy: { created_at: "asc" },
        select: { userId: true, created_at: true },
      },
    },
  });

  if (chatRooms.length === 0) {
    return { rate: 0, averageTime: 0, totalMessages: 0 };
  }

  let totalResponseTime = 0;
  let responseCount = 0;
  let totalMessages = 0;
  let userMessages = 0;

  chatRooms.forEach((room) => {
    const messages = room.messages;
    const isSeller = room.product.userId === userId;

    messages.forEach((message, i) => {
      // 내가 보낸 메세지 수
      if (message.userId === userId) {
        userMessages++;
      }
      // 응답률/응답시간은 "판매자" 기준으로만 계산
      if (!isSeller) {
        totalMessages++;
        return;
      }

      if (i > 0) {
        const previousMessage = messages[i - 1];

        // "상대방 메시지 -> 내 메시지" 순서인 경우 응답으로 간주
        if (message.userId === userId && previousMessage.userId !== userId) {
          const responseTime = Math.floor(
            (message.created_at.getTime() -
              previousMessage.created_at.getTime()) /
              (1000 * 60) // 분 단위
          );
          totalResponseTime += responseTime;
          responseCount++;
        }
      }

      totalMessages++;
    });
  });

  const responseRate =
    totalMessages > 0 ? (responseCount / totalMessages) * 100 : 0;
  const averageResponseTime =
    responseCount > 0 ? totalResponseTime / responseCount : 0;

  return {
    rate: responseRate,
    averageTime: averageResponseTime,
    // 기존 구현과 동일하게 "내가 보낸 메시지 수"를 totalMessages로 노출
    totalMessages: userMessages,
  };
}

/**
 * [뱃지용] 카테고리별 평균 평점 계산
 */
export async function calculateCategoryRating(
  userId: number,
  categoryId: number
): Promise<number> {
  const reviews = await db.product.findMany({
    where: {
      userId,
      category: { id: categoryId },
      purchase_userId: { not: null },
    },
    select: {
      reviews: {
        where: { userId: { not: userId } },
        select: { rate: true },
      },
    },
  });

  const allRatings = reviews.flatMap((product) =>
    product.reviews.map((r) => r.rate)
  );

  if (allRatings.length === 0) return 0;

  const averageRating =
    allRatings.reduce((acc, curr) => acc + curr, 0) / allRatings.length;

  return Number(averageRating.toFixed(1));
}

/**
 * [뱃지용] 커뮤니티 인기도 계산 (보드게임 탐험가)
 * - 보물지도(MAP)와 항해일지(LOG) 카테고리의 게시글 대상
 * - 최근 6개월 기준 댓글 10개 이상, 좋아요 30개 이상 달성 여부
 * - return(0/1)
 */
export async function isPopularity(userId: number): Promise<number> {
  const since = new Date();
  since.setMonth(since.getMonth() - 6); // 최근 6개월

  const posts = await db.post.findMany({
    where: {
      userId,
      created_at: { gte: since },
      // 보물지도 (규칙 설명/공략) , 항해 일지 (게임 후기/리뷰)
      OR: [{ category: "MAP" }, { category: "LOG" }],
    },
    include: {
      post_likes: true,
      comments: true,
    },
  });

  if (posts.length === 0) return 0;

  const totalLikes = posts.reduce((sum, p) => sum + p.post_likes.length, 0);
  const totalComments = posts.reduce((sum, p) => sum + p.comments.length, 0);

  if (totalComments >= 10 && totalLikes >= 30) {
    return 1;
  } else {
    return 0;
  }
}
