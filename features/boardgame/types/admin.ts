/**
 * File Name : features/boardgame/types/admin.ts
 * Description : 관리자 보드게임 카탈로그 타입
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   관리자 목록 응답 타입 분리
 * 2026.05.05  임도헌   Modified  관리자 CSV import 처리 요약 타입 통합
 */

import type { BoardGameLocaleStatus } from "@/generated/prisma/enums";

export interface BoardGameAdminListItem {
  id: number;
  bggId: number;
  primaryName: string;
  yearPublished: number | null;
  bggRank: number | null;
  userRatings: number | null;
  family: string | null;
  imageUrl: string | null;
  lastSyncedAt: Date | null;
  locale: {
    title: string;
    aliases: string[];
    status: BoardGameLocaleStatus;
    shortDescription: string | null;
    searchKeywords: string[];
  } | null;
}

export interface BoardGameAdminListResponse {
  items: BoardGameAdminListItem[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface BoardGameCsvImportSummary {
  imported: number;
  created: number;
  updated: number;
  skipped: number;
  skippedSamples: string[];
  truncated: boolean;
}

export interface BoardGameLocaleCsvImportSummary {
  imported: number;
  created: number;
  updated: number;
  skipped: number;
  skippedSamples: string[];
}

export interface BoardGameLocaleBulkPublishSummary {
  published: number;
}

export interface BoardGameMechanicsCsvImportSummary {
  connectedGames: number;
  connectedMechanics: number;
  skipped: number;
  skippedSamples: string[];
}

export interface BoardGameCategoriesCsvImportSummary {
  connectedGames: number;
  connectedCategories: number;
  skipped: number;
  skippedSamples: string[];
}

export interface BoardGameTaxonomyKoreanNameCsvImportSummary {
  updated: number;
  skipped: number;
  skippedSamples: string[];
}
