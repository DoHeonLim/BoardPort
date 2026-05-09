/**
 * File Name : features/boardgame/service/csv/parseMetadata.ts
 * Description : Kaggle 보드게임 원천 메타데이터 CSV parser
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.28  임도헌   Created   Kaggle CSV 기반 보드게임 메타데이터 정규화 로직 추가
 * 2026.04.28  임도헌   Modified  인기도/추천 인원/시리즈 메타데이터 parsing 추가
 * 2026.05.03  임도헌   Modified  CSV import 최대 행 수와 Description 미사용 정책 반영
 * 2026.05.05  임도헌   Modified  Kaggle 원천 메타데이터 parser 분리
 */

import "server-only";
import { MAX_BOARDGAME_CSV_IMPORT_ROWS } from "@/features/boardgame/constants";
import {
  parseCsv,
  readBoolean,
  readNumber,
  readString,
  readStringList,
  readTaxonomies,
  readUrl,
  toCsvRow,
} from "@/features/boardgame/utils/csv";
import type { ServiceResult } from "@/lib/types";
import type { BoardGameMetadataImportPayload } from "@/features/boardgame/types/import";

interface KaggleBoardGameCsvParseResult {
  items: BoardGameMetadataImportPayload[];
  rowsRead: number;
  skipped: number;
  skippedSamples: string[];
  truncated: boolean;
}

/**
 * Kaggle에서 내려받은 BGG 기반 CSV를 BoardPort 메타데이터 payload로 변환
 *
 * - CSV 컬럼명은 데이터셋마다 조금씩 다르므로 흔한 alias를 폭넓게 허용
 * - BGG 장문 description, 리뷰, 사용자 코멘트는 import 대상에서 제외
 * - 관리자 실수로 대용량 전체 CSV를 올리는 상황을 피하기 위해 1회 최대 import 행 수를 제한
 *
 * @param csvText - Kaggle CSV 원문
 * @returns 정규화된 import 후보
 */
export function parseKaggleBoardGameCsv(
  csvText: string
): ServiceResult<KaggleBoardGameCsvParseResult> {
  try {
    const rows = parseCsv(csvText);
    if (rows.length < 2) {
      return {
        success: false,
        error: "CSV 헤더와 데이터 행을 확인해주세요.",
      };
    }

    const headers = rows[0].map((header) => header.trim());
    const dataRows = rows.slice(1);
    const items: BoardGameMetadataImportPayload[] = [];
    const skippedSamples: string[] = [];
    let skipped = 0;

    for (const rawRow of dataRows) {
      if (items.length >= MAX_BOARDGAME_CSV_IMPORT_ROWS) break;

      const row = toCsvRow(headers, rawRow);
      // bggId와 원제는 이후 locale/mechanics/taxonomy CSV 연결 기준값이라 누락 시 제외
      const bggId = readNumber(row, [
        "BGGId",
        "BGG ID",
        "bgg_id",
        "objectid",
        "object_id",
        "game_id",
        "id",
      ]);
      const primaryName = readString(row, [
        "Name",
        "Primary Name",
        "primaryName",
        "primary_name",
        "game",
        "title",
      ]);

      if (!bggId || !primaryName) {
        skipped += 1;
        if (skippedSamples.length < 5) {
          skippedSamples.push(primaryName || rawRow[0] || "이름 없는 행");
        }
        continue;
      }

      items.push({
        bggId,
        primaryName,
        bggUrl: `https://boardgamegeek.com/boardgame/${bggId}`,
        yearPublished: readNumber(row, [
          "YearPublished",
          "Year Published",
          "year_published",
          "year",
        ]),
        minPlayers: readNumber(row, [
          "MinPlayers",
          "Min Players",
          "min_players",
        ]),
        maxPlayers: readNumber(row, [
          "MaxPlayers",
          "Max Players",
          "max_players",
        ]),
        minPlayTime: readNumber(row, [
          "ComMinPlaytime",
          "MinPlayTime",
          "Min Playtime",
          "min_playtime",
        ]),
        maxPlayTime: readNumber(row, [
          "ComMaxPlaytime",
          "MaxPlayTime",
          "Max Playtime",
          "max_playtime",
        ]),
        playingTime: readNumber(row, [
          "MfgPlaytime",
          "PlayingTime",
          "Playing Time",
          "playtime",
        ]),
        minAge: readNumber(row, [
          "MfgAgeRec",
          "ComAgeRec",
          "MinAge",
          "Min Age",
          "age",
        ]),
        weightAverage: readNumber(row, [
          "GameWeight",
          "AvgWeight",
          "AverageWeight",
          "WeightAverage",
          "Weight",
          "avg_weight",
        ]),
        bggRating: readNumber(row, [
          "AvgRating",
          "AverageRating",
          "Rating",
          "avg_rating",
        ]),
        bayesRating: readNumber(row, [
          "BayesAvgRating",
          "Bayes Average Rating",
          "bayes_avg_rating",
        ]),
        bggRank: readNumber(row, [
          "Rank:boardgame",
          "BoardGameRank",
          "Board Game Rank",
          "Rank",
          "rank",
        ]),
        userRatings: readNumber(row, [
          "NumUserRatings",
          "UsersRated",
          "Users Rated",
          "num_user_ratings",
        ]),
        bestPlayers: readString(row, [
          "BestPlayers",
          "Best Players",
          "best_players",
        ]),
        goodPlayers: readStringList(row, [
          "GoodPlayers",
          "Good Players",
          "good_players",
        ]),
        family: readString(row, ["Family", "family"]),
        kickstarted: readBoolean(row, ["Kickstarted", "Kickstarter"]),
        imageUrl: readUrl(row, [
          "ImagePath",
          "ImageURL",
          "Image URL",
          "ImageUrl",
          "image",
        ]),
        thumbnailUrl: readUrl(row, [
          "Thumbnail",
          "ThumbnailUrl",
          "Thumbnail URL",
          "thumbnail",
        ]),
        categories: readTaxonomies(row, ["Categories", "Category"], [
          "Cat:",
          "Category:",
        ]),
        mechanics: readTaxonomies(row, ["Mechanics", "Mechanic"], [
          "Mechanic:",
          "Mech:",
        ]),
        // Description 컬럼은 존재해도 미저장. 한국어 설명은 관리자 검수 locale에서 별도 작성
        descriptionAvailable: false,
      });
    }

    return {
      success: true,
      data: {
        items,
        rowsRead: dataRows.length,
        skipped,
        skippedSamples,
        truncated: items.length >= MAX_BOARDGAME_CSV_IMPORT_ROWS,
      },
    };
  } catch (error) {
    console.error("[Kaggle BoardGame CSV Parse Error]", error);
    return {
      success: false,
      error: "Kaggle CSV를 읽는 중 오류가 발생했습니다.",
    };
  }
}
