/**
 * File Name : features/realtime/topics.test.ts
 * Description : Realtime topic 네임스페이스와 입력 검증 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   개인·상품·방송 topic 충돌 및 비정상 ID 방어 검증
 */

import { describe, expect, it } from "vitest";
import {
  chatRoomsRealtimeTopic,
  notificationRealtimeTopic,
  productChatRealtimeTopic,
  streamChatRealtimeTopic,
} from "@/features/realtime/topics";

describe("Realtime topic factories", () => {
  it("도메인마다 충돌하지 않는 topic을 만든다", () => {
    expect(notificationRealtimeTopic(7)).toBe("user:7:notifications");
    expect(chatRoomsRealtimeTopic(7)).toBe("user:7:chat-rooms");
    expect(productChatRealtimeTopic("room_cuid-1")).toBe(
      "product-room:room_cuid-1"
    );
    expect(streamChatRealtimeTopic(7)).toBe("stream-room:7");
  });

  it("잘못된 숫자 ID와 topic 구분자를 주입하는 문자열을 거절한다", () => {
    expect(() => notificationRealtimeTopic(0)).toThrow();
    expect(() => streamChatRealtimeTopic(Number.NaN)).toThrow();
    expect(() => productChatRealtimeTopic("room:other-user")).toThrow();
  });
});
