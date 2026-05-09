/**
 * File Name : features/boardgame/service/adminLocale.ts
 * Description : 관리자 보드게임 한국어 locale 저장/공개 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.28  임도헌   Created   한국어 locale 저장 서비스 추가
 * 2026.04.29  임도헌   Modified  PUBLISHED locale 공개 조건과 검수자 저장 기준 보강
 * 2026.04.29  임도헌   Modified  짧은 설명이 있는 한국어 locale 일괄 공개 서비스 추가
 * 2026.05.05  임도헌   Modified  locale 저장과 일괄 공개 mutation을 admin.ts에서 분리
 */

import "server-only";
import db from "@/lib/db";
import { normalizeStringList } from "@/features/boardgame/utils/importHelpers";
import {
  BoardGameLocaleSource,
  BoardGameLocaleStatus,
} from "@/generated/prisma/enums";
import type { ServiceResult } from "@/lib/types";
import type { BoardGameLocaleBulkPublishSummary } from "@/features/boardgame/types/admin";
import type { BoardGameKoreanLocaleInput } from "@/features/boardgame/types/import";

/**
 * 공개 조건을 만족한 한국어 locale을 일괄 공개
 *
 * 짧은 설명이 없는 항목은 공개하지 않아 CSV 초안 import 직후 빈 설명 항목 노출 제한
 *
 * @param adminId - 일괄 공개를 승인한 관리자 ID
 * @returns {Promise<ServiceResult<BoardGameLocaleBulkPublishSummary>>} 일괄 공개 처리 요약
 */
export async function publishReadyBoardGameLocales(
  adminId: number
): Promise<ServiceResult<BoardGameLocaleBulkPublishSummary>> {
  try {
    const result = await db.boardGameLocale.updateMany({
      where: {
        locale: "ko",
        status: {
          in: [BoardGameLocaleStatus.DRAFT, BoardGameLocaleStatus.REVIEWED],
        },
        shortDescription: { not: null },
        NOT: {
          shortDescription: "",
        },
      },
      data: {
        status: BoardGameLocaleStatus.PUBLISHED,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    return {
      success: true,
      data: {
        published: result.count,
      },
    };
  } catch (error) {
    console.error("[BoardGame Locale Bulk Publish Error]", error);
    return {
      success: false,
      error: "공개 가능한 보드게임을 일괄 공개하지 못했습니다.",
    };
  }
}

/**
 * 한국어 보드게임 표시 정보를 관리자 검수 데이터로 저장
 *
 * @param adminId - 검수한 관리자 ID
 * @param boardGameId - 보드게임 ID
 * @param input - 한국어 제목/별칭/설명/공개 상태
 * @returns {Promise<ServiceResult<{ id: number; status: BoardGameLocaleStatus }>>} 저장된 locale 요약
 */
export async function saveBoardGameKoreanLocale(
  adminId: number,
  boardGameId: number,
  input: BoardGameKoreanLocaleInput
): Promise<ServiceResult<{ id: number; status: BoardGameLocaleStatus }>> {
  try {
    const boardGame = await db.boardGame.findUnique({
      where: { id: boardGameId },
      select: { id: true },
    });

    if (!boardGame) {
      return { success: false, error: "보드게임 정보를 찾을 수 없습니다." };
    }

    const status = input.status ?? BoardGameLocaleStatus.DRAFT;
    const title = input.title.trim();
    const shortDescription = input.shortDescription?.trim() || null;

    if (status === BoardGameLocaleStatus.PUBLISHED && !shortDescription) {
      return {
        success: false,
        error: "공개 상태로 전환하려면 짧은 설명을 입력해주세요.",
      };
    }

    const shouldMarkReviewed =
      status === BoardGameLocaleStatus.REVIEWED ||
      status === BoardGameLocaleStatus.PUBLISHED;
    // 검수 완료 이상의 상태만 관리자/검수 시각을 남겨 초안과 운영 공개 데이터 구분
    const reviewedAt = shouldMarkReviewed ? new Date() : null;

    const locale = await db.boardGameLocale.upsert({
      where: {
        boardGameId_locale: {
          boardGameId,
          locale: "ko",
        },
      },
      update: {
        title,
        aliases: normalizeStringList(input.aliases),
        shortDescription,
        searchKeywords: normalizeStringList(input.searchKeywords),
        status,
        sourceType: BoardGameLocaleSource.ADMIN,
        reviewedById: shouldMarkReviewed ? adminId : null,
        reviewedAt,
      },
      create: {
        boardGameId,
        locale: "ko",
        title,
        aliases: normalizeStringList(input.aliases),
        shortDescription,
        searchKeywords: normalizeStringList(input.searchKeywords),
        status,
        sourceType: BoardGameLocaleSource.ADMIN,
        reviewedById: shouldMarkReviewed ? adminId : null,
        reviewedAt,
      },
      select: {
        id: true,
        status: true,
      },
    });

    return { success: true, data: locale };
  } catch (error) {
    console.error("[BoardGame Locale Save Error]", error);
    return {
      success: false,
      error: "한국어 보드게임 정보를 저장하지 못했습니다.",
    };
  }
}
