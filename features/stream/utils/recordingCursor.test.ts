/**
 * File Name : features/stream/utils/recordingCursor.test.ts
 * Description : 다시보기 목록 복합 커서 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   최신·인기 커서 왕복과 잘못된 정렬·payload 거부 검증
 * 2026.08.27  임도헌   Modified  과도하게 긴 커서 거부 경계 추가
 */

import { describe, expect, it, vi } from "vitest";
import {
  decodeRecordingCursor,
  encodeRecordingCursor,
} from "@/features/stream/utils/recordingCursor";

vi.mock("server-only", () => ({}));

const source = {
  vodId: 37,
  readyAt: new Date("2026-08-26T10:30:00.000Z"),
  viewCount: 125,
};

describe("recordingCursor", () => {
  it.each(["latest", "popular"] as const)(
    "%s 정렬값을 불투명 커서로 왕복한다",
    (sort) => {
      const cursor = encodeRecordingCursor(sort, source);

      expect(cursor).not.toBeNull();
      expect(cursor).not.toContain("2026-08-26");
      expect(decodeRecordingCursor(cursor, sort)).toEqual({
        sort,
        readyAt: source.readyAt,
        id: source.vodId,
        views: source.viewCount,
      });
    }
  );

  it("다른 정렬에서 발급한 커서를 재사용하지 않는다", () => {
    const cursor = encodeRecordingCursor("latest", source);

    expect(decodeRecordingCursor(cursor, "popular")).toBeNull();
  });

  it.each([
    "not+base64",
    `${encodeRecordingCursor("latest", source)}!`,
    Buffer.from("{}").toString("base64url"),
  ])("형식이 잘못된 커서를 거부한다: %s", (cursor) => {
    expect(decodeRecordingCursor(cursor, "latest")).toBeNull();
  });

  it("길이 제한을 넘는 커서를 decode 전에 거부한다", () => {
    expect(decodeRecordingCursor("a".repeat(513), "latest")).toBeNull();
  });

  it("정렬값이 불완전한 VOD에는 다음 커서를 발급하지 않는다", () => {
    expect(
      encodeRecordingCursor("popular", {
        vodId: 37,
        readyAt: null,
        viewCount: 125,
      })
    ).toBeNull();
  });
});
