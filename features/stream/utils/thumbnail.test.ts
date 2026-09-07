/**
 * File Name : features/stream/utils/thumbnail.test.ts
 * Description : 제한 방송 목록 썸네일 노출 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   PUBLIC·소유자와 제한 방송 비소유자의 provider 썸네일 경계 검증
 */

import { describe, expect, it } from "vitest";
import { selectRecordingThumbnail } from "./thumbnail";

const base = {
  providerThumbnail:
    "https://customer.example.cloudflarestream.com/provider-uid/thumbnails/thumbnail.jpg",
  broadcastThumbnail: "https://images.example.com/broadcast.jpg",
  broadcastThumbnailAnimated: true,
};

describe("selectRecordingThumbnail", () => {
  it("PUBLIC 목록은 provider VOD 썸네일을 사용할 수 있다", () => {
    expect(
      selectRecordingThumbnail({
        ...base,
        visibility: "PUBLIC",
        isOwner: false,
      })
    ).toEqual({
      thumbnail: base.providerThumbnail,
      thumbnailAnimated: false,
    });
  });

  it.each(["PRIVATE", "FOLLOWERS"] as const)(
    "%s 비소유자 목록은 provider URL 대신 방송 썸네일을 사용한다",
    (visibility) => {
      expect(
        selectRecordingThumbnail({ ...base, visibility, isOwner: false })
      ).toEqual({
        thumbnail: base.broadcastThumbnail,
        thumbnailAnimated: true,
      });
    }
  );

  it("제한 방송도 소유자 목록에서는 처리된 VOD 썸네일을 표시한다", () => {
    expect(
      selectRecordingThumbnail({
        ...base,
        visibility: "PRIVATE",
        isOwner: true,
      })
    ).toEqual({
      thumbnail: base.providerThumbnail,
      thumbnailAnimated: false,
    });
  });
});
