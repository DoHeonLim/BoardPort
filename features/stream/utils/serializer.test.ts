/**
 * File Name : features/stream/utils/serializer.test.ts
 * Description : 방송 카드 직렬화 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   방송 공개 범위와 연결 보드게임 직렬화 테스트 추가
 */

import { describe, expect, it } from "vitest";
import { serializeStream } from "./serializer";
import type { StreamVisibility } from "@/features/stream/types";

const createBaseStream = (visibility: StreamVisibility = "PUBLIC") => ({
  id: 1,
  stream_id: "live-input-id",
  title: "테스트 방송",
  description: null,
  thumbnail: null,
  thumbnailAnimated: false,
  status: "CONNECTED",
  started_at: new Date("2026-05-25T10:00:00.000Z"),
  ended_at: null,
  userId: 10,
  user: { id: 10, username: "host", avatar: null },
  category: { id: 1, kor_name: "게임 플레이", icon: null },
  tags: [{ name: "보드게임" }],
  board_games: [],
  visibility,
});

describe("serializeStream", () => {
  it("CONNECTED 상태를 live 상태로 직렬화한다", () => {
    const stream = serializeStream(
      createBaseStream("PUBLIC"),
      { isFollowing: false, isMine: false }
    );

    expect(stream.isLive).toBe(true);
    expect(stream.requiresPassword).toBe(false);
    expect(stream.followersOnlyLocked).toBe(false);
  });

  it("PRIVATE 방송은 소유자가 아니면 비밀번호 필요 상태로 표시한다", () => {
    const visitorStream = serializeStream(
      createBaseStream("PRIVATE"),
      { isFollowing: false, isMine: false }
    );
    const ownerStream = serializeStream(
      createBaseStream("PRIVATE"),
      { isFollowing: false, isMine: true }
    );

    expect(visitorStream.requiresPassword).toBe(true);
    expect(ownerStream.requiresPassword).toBe(false);
  });

  it("FOLLOWERS 방송은 소유자/팔로워가 아니면 잠금 상태로 표시한다", () => {
    const visitorStream = serializeStream(
      createBaseStream("FOLLOWERS"),
      { isFollowing: false, isMine: false }
    );
    const followerStream = serializeStream(
      createBaseStream("FOLLOWERS"),
      { isFollowing: true, isMine: false }
    );

    expect(visitorStream.followersOnlyLocked).toBe(true);
    expect(followerStream.followersOnlyLocked).toBe(false);
  });

  it("공개 locale이 없는 연결 보드게임은 노출하지 않는다", () => {
    const stream = serializeStream(
      {
        ...createBaseStream("PUBLIC"),
        board_games: [
          {
            boardGame: {
              id: 1,
              primaryName: "No Locale Game",
              imageUrl: null,
              locales: [],
            },
          },
          {
            boardGame: {
              id: 2,
              primaryName: "Localized Game",
              imageUrl: null,
              locales: [{ title: "한국어 게임", aliases: [] }],
            },
          },
        ],
      },
      { isFollowing: false, isMine: false }
    );

    expect(stream.board_games).toHaveLength(1);
    expect(stream.board_games?.[0]?.boardGame.locale.title).toBe("한국어 게임");
  });
});
