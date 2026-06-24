/**
 * File Name : features/notification/utils/rendering.test.ts
 * Description : 알림 이미지 렌더링과 삭제 콘텐츠 안내 표시 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   알림 이미지 출처와 이동 불가 안내 표시 규칙 테스트 추가
 */

import { describe, expect, it } from "vitest";
import {
  isRenderableNotificationImage,
  shouldShowUnavailableNotificationCopy,
} from "./rendering";

describe("notification rendering utils", () => {
  it("허용된 이미지 출처만 렌더링 대상으로 본다", () => {
    expect(
      isRenderableNotificationImage(
        "https://imagedelivery.net/account/image-id/public"
      )
    ).toBe(true);
    expect(isRenderableNotificationImage("/images/fallback.png")).toBe(true);
    expect(isRenderableNotificationImage("data:image/png;base64,test")).toBe(
      true
    );
  });

  it("http 또는 미허용 host 이미지는 렌더링 대상에서 제외한다", () => {
    expect(
      isRenderableNotificationImage(
        "http://imagedelivery.net/account/image-id/public"
      )
    ).toBe(false);
    expect(isRenderableNotificationImage("https://example.com/image.png")).toBe(
      false
    );
    expect(isRenderableNotificationImage("not-a-url")).toBe(false);
    expect(isRenderableNotificationImage(null)).toBe(false);
  });

  it("링크가 제거된 콘텐츠형 알림에만 이동 불가 안내를 표시한다", () => {
    expect(
      shouldShowUnavailableNotificationCopy({ type: "TRADE", link: null })
    ).toBe(true);
    expect(
      shouldShowUnavailableNotificationCopy({ type: "KEYWORD", link: "" })
    ).toBe(true);
    expect(
      shouldShowUnavailableNotificationCopy({
        type: "TRADE",
        link: "/products/view/1",
      })
    ).toBe(false);
    expect(
      shouldShowUnavailableNotificationCopy({ type: "SYSTEM", link: null })
    ).toBe(false);
  });
});
