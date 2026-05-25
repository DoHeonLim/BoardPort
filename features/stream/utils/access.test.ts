/**
 * File Name : features/stream/utils/access.test.ts
 * Description : 방송/VOD 접근 상태 유틸 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   방송 공개 범위와 VOD 준비 상태 판단 테스트 추가
 */

import { describe, expect, it } from "vitest";
import {
  isFollowersVisibility,
  isPrivateVisibility,
  isVodReady,
  unlockErrorMessage,
} from "./access";

describe("stream access utils", () => {
  it("PRIVATE/FOLLOWERS 공개 범위를 구분한다", () => {
    expect(isPrivateVisibility("PRIVATE")).toBe(true);
    expect(isPrivateVisibility("PUBLIC")).toBe(false);
    expect(isFollowersVisibility("FOLLOWERS")).toBe(true);
    expect(isFollowersVisibility("PRIVATE")).toBe(false);
  });

  it("READY 상태의 VOD만 시청 가능 상태로 본다", () => {
    expect(isVodReady("READY")).toBe(true);
    expect(isVodReady("INPROGRESS")).toBe(false);
    expect(isVodReady("ERROR")).toBe(false);
  });

  it("비공개 방송 unlock 실패 코드를 사용자 메시지로 변환한다", () => {
    expect(unlockErrorMessage.INVALID_PASSWORD).toBe(
      "비밀번호가 올바르지 않습니다."
    );
    expect(unlockErrorMessage.MISSING_PASSWORD).toBe(
      "비밀번호를 입력해주세요."
    );
  });
});
