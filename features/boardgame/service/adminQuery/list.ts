/**
 * File Name : features/boardgame/service/adminQuery/list.ts
 * Description : 관리자 보드게임 목록 조회 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.28  임도헌   Created   보드게임 관리자 목록 조회 서비스 추가
 * 2026.04.29  임도헌   Modified  한국어 locale 검수 데이터 기준 관리자 목록 표시 보강
 * 2026.05.05  임도헌   Modified  관리자 목록 조회를 admin.ts에서 분리
 */

import "server-only";
import db from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { ServiceResult } from "@/lib/types";
import type { BoardGameAdminListResponse } from "@/features/boardgame/types/admin";

/**
 * 관리자용 보드게임 목록 조회
 *
 * @param page - 현재 페이지
 * @param limit - 페이지당 항목 수
 * @param query - BGG ID, 원제, 한국어 제목 검색어
 * @returns {Promise<ServiceResult<BoardGameAdminListResponse>>} 보드게임 관리자 목록
 */
export async function getBoardGamesAdmin(
  page = 1,
  limit = 20,
  query?: string
): Promise<ServiceResult<BoardGameAdminListResponse>> {
  try {
    const skip = (page - 1) * limit;
    const trimmedQuery = query?.trim();
    const parsedBggId =
      trimmedQuery && /^\d+$/.test(trimmedQuery) ? Number(trimmedQuery) : null;
    const where: Prisma.BoardGameWhereInput = trimmedQuery
      ? {
          OR: [
            { primaryName: { contains: trimmedQuery, mode: "insensitive" } },
            {
              locales: {
                some: {
                  title: { contains: trimmedQuery, mode: "insensitive" },
                },
              },
            },
            {
              locales: {
                some: {
                  aliases: { has: trimmedQuery },
                },
              },
            },
            {
              locales: {
                some: {
                  searchKeywords: { has: trimmedQuery },
                },
              },
            },
            ...(parsedBggId !== null ? [{ bggId: parsedBggId }] : []),
          ],
        }
      : {};

    const [total, items] = await Promise.all([
      db.boardGame.count({ where }),
      db.boardGame.findMany({
        where,
        select: {
          id: true,
          bggId: true,
          primaryName: true,
          yearPublished: true,
          bggRank: true,
          userRatings: true,
          family: true,
          imageUrl: true,
          lastSyncedAt: true,
          locales: {
            where: { locale: "ko" },
            select: {
              title: true,
              aliases: true,
              status: true,
              shortDescription: true,
              searchKeywords: true,
            },
            take: 1,
          },
        },
        orderBy: [{ bggRank: "asc" }, { id: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    return {
      success: true,
      data: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        items: items.map(({ locales, ...item }) => ({
          ...item,
          locale: locales[0] ?? null,
        })),
      },
    };
  } catch (error) {
    console.error("[BoardGame Admin List Error]", error);
    return {
      success: false,
      error: "보드게임 목록을 불러오지 못했습니다.",
    };
  }
}
