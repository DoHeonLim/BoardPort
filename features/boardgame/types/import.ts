/**
 * File Name : features/boardgame/types/import.ts
 * Description : 보드게임 CSV import payload 타입
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   CSV import payload와 parse result 타입 분리
 * 2026.05.05  임도헌   Modified  parser 전용 result와 관리자 summary 타입을 사용처 가까이 이동
 */

import type {
  BoardGameLocaleSource,
  BoardGameLocaleStatus,
  BoardGameTaxonomyType,
} from "@/generated/prisma/enums";

export interface BoardGameTaxonomyItem {
  name: string;
}

/**
 * Kaggle CSV에서 가져오는 원천 메타데이터
 * 한국어 제목/설명은 이 payload가 아니라 BoardGameLocale에서 관리자 검수 데이터로 관리
 */
export interface BoardGameMetadataImportPayload {
  bggId: number;
  primaryName: string;
  bggUrl: string;
  yearPublished: number | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  minPlayTime?: number | null;
  maxPlayTime?: number | null;
  playingTime?: number | null;
  minAge: number | null;
  weightAverage: number | null;
  bggRating: number | null;
  bayesRating: number | null;
  bggRank: number | null;
  userRatings: number | null;
  bestPlayers: string | null;
  goodPlayers: string[];
  family: string | null;
  kickstarted: boolean | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  categories: BoardGameTaxonomyItem[];
  mechanics: BoardGameTaxonomyItem[];
  descriptionAvailable: boolean;
}

export interface BoardGameKoreanLocaleInput {
  title: string;
  aliases?: string[];
  shortDescription?: string | null;
  searchKeywords?: string[];
  status?: BoardGameLocaleStatus;
}

export interface BoardGameKoreanLocaleImportPayload
  extends BoardGameKoreanLocaleInput {
  bggId: number;
  sourceType: BoardGameLocaleSource;
}

export interface BoardGameMechanicsImportPayload {
  bggId: number;
  primaryName: string | null;
  mechanics: BoardGameTaxonomyItem[];
}

export interface BoardGameCategoriesImportPayload {
  bggId: number;
  primaryName: string | null;
  categories: BoardGameTaxonomyItem[];
}

export interface BoardGameTaxonomyKoreanNameImportPayload {
  type: BoardGameTaxonomyType;
  bggName: string;
  koName: string;
}
