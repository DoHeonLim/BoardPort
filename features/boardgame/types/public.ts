/**
 * File Name : features/boardgame/types/public.ts
 * Description : 공개 보드게임 카탈로그 타입
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   공개 목록/상세/연결 콘텐츠 타입 분리
 */

export interface BoardGamePublicListItem {
  id: number;
  bggId: number;
  primaryName: string;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  weightAverage: number | null;
  bayesRating: number | null;
  userRatings: number | null;
  bestPlayers: string | null;
  goodPlayers: string[];
  family: string | null;
  bggRank: number | null;
  imageUrl: string | null;
  categories: BoardGamePublicTaxonomy[];
  mechanics: BoardGamePublicTaxonomy[];
  locale: {
    title: string;
    aliases: string[];
    shortDescription: string | null;
  };
}

export interface BoardGamePublicTaxonomy {
  id: number;
  bggName: string;
  koName: string | null;
}

export interface BoardGamePublicListResponse {
  items: BoardGamePublicListItem[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface BoardGameSimilarItem {
  id: number;
  primaryName: string;
  imageUrl: string | null;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  bayesRating: number | null;
  locale: {
    title: string;
    shortDescription: string | null;
  };
  sharedCategories: number;
  sharedMechanics: number;
}

export interface BoardGameRelationOption {
  id: number;
  primaryName: string;
  imageUrl: string | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  minPlayTime?: number | null;
  maxPlayTime?: number | null;
  playingTime?: number | null;
  locale: {
    title: string;
    aliases: string[];
  };
}

export interface BoardGameRelatedContent {
  products: Array<{
    id: number;
    title: string;
    price: number;
    imageUrl: string | null;
  }>;
  posts: Array<{
    id: number;
    title: string;
    category: string;
    createdAt: Date;
  }>;
  broadcasts: Array<{
    id: number;
    title: string;
    status: string;
    vodIdForRecording: number | null;
    thumbnail: string | null;
    startedAt: Date | null;
  }>;
}

export interface BoardGamePublicDetail extends BoardGamePublicListItem {
  bggUrl: string;
  minPlayTime: number | null;
  maxPlayTime: number | null;
  minAge: number | null;
  bggRating: number | null;
  kickstarted: boolean | null;
  thumbnailUrl: string | null;
  categories: BoardGamePublicTaxonomy[];
  mechanics: BoardGamePublicTaxonomy[];
}
