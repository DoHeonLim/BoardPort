/**
 * File Name : features/boardgame/service/publicQuery/relationOptions.test.ts
 * Description : 보드게임 연결 선택용 공개 option 조회 검증
 *
 * History
 * 2026.09.10 Created 기본 제한 밖의 도감 진입 게임 포함과 중복 제거 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  default: {
    boardGame: { findMany: mocks.findMany },
  },
}));

const createBoardGame = (id: number, title: string) => ({
  id,
  primaryName: title,
  imageUrl: null,
  minPlayers: null,
  maxPlayers: null,
  minPlayTime: null,
  maxPlayTime: null,
  playingTime: null,
  locales: [{ title, aliases: [] }],
});

describe("getBoardGameRelationOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("포함 ID가 없으면 기본 공개 목록만 조회", async () => {
    mocks.findMany.mockResolvedValueOnce([createBoardGame(1, "첫 게임")]);
    const { getBoardGameRelationOptions } = await import("./relationOptions");

    const result = await getBoardGameRelationOptions();

    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      success: true,
      data: [{ id: 1, locale: { title: "첫 게임" } }],
    });
  });

  it("기본 제한 밖의 공개 도감 진입 게임을 선택지에 추가", async () => {
    mocks.findMany
      .mockResolvedValueOnce([createBoardGame(1, "첫 게임")])
      .mockResolvedValueOnce([createBoardGame(701, "추가 게임")]);
    const { getBoardGameRelationOptions } = await import("./relationOptions");

    const result = await getBoardGameRelationOptions({
      limit: 1,
      includeIds: [701],
    });

    expect(mocks.findMany).toHaveBeenCalledTimes(2);
    expect(mocks.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: [701] } }),
      })
    );
    expect(result.success && result.data.map(({ id }) => id)).toEqual([1, 701]);
  });

  it("기본 목록에 이미 있는 포함 게임은 중복 제거", async () => {
    const included = createBoardGame(42, "중복 게임");
    mocks.findMany
      .mockResolvedValueOnce([included])
      .mockResolvedValueOnce([included]);
    const { getBoardGameRelationOptions } = await import("./relationOptions");

    const result = await getBoardGameRelationOptions({ includeIds: [42] });

    expect(result.success && result.data.map(({ id }) => id)).toEqual([42]);
  });
});
