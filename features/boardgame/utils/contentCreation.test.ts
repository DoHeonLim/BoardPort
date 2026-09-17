/**
 * File Name : features/boardgame/utils/contentCreation.test.ts
 * Description : 보드게임 연결 콘텐츠 생성 문맥 검증
 *
 * History
 * 2026.09.10 Created 공개 옵션 사전 선택과 작성 화면 복귀 URL 검증
 */

import { describe, expect, it } from "vitest";
import {
  buildBoardGameContentCreationHref,
  getBoardGameCreationPrefill,
  parseBoardGameCreationId,
} from "@/features/boardgame/utils/contentCreation";
import type { BoardGameRelationOption } from "@/features/boardgame/types/public";

const options: BoardGameRelationOption[] = [
  {
    id: 42,
    primaryName: "Terraforming Mars",
    imageUrl: null,
    locale: { title: "테라포밍 마스", aliases: [] },
  },
];

describe("보드게임 연결 콘텐츠 생성 문맥", () => {
  it("공개 연결 옵션에 있는 ID만 작성 폼 초기값으로 사용", () => {
    expect(getBoardGameCreationPrefill("42", options)).toEqual([42]);
    expect(getBoardGameCreationPrefill("41", options)).toEqual([]);
  });

  it.each([undefined, "", "0", "-1", "1.5", "abc", "9007199254740992"])(
    "비정상 ID %s를 초기 선택에서 제외",
    (value) => {
      expect(getBoardGameCreationPrefill(value, options)).toEqual([]);
    }
  );

  it("유효한 양의 정수 query만 조회 포함 ID로 정규화", () => {
    expect(parseBoardGameCreationId("42")).toBe(42);
    expect(parseBoardGameCreationId("1.5")).toBeNull();
  });

  it("작성 화면 URL에 보드게임 선택과 상세 복귀 문맥을 함께 포함", () => {
    expect(buildBoardGameContentCreationHref("/posts/add", 42)).toBe(
      "/posts/add?boardGameId=42&returnTo=%2Fboardgames%2F42"
    );
  });
});
