/**
 * File Name : features/auth/utils/authContextReset.test.ts
 * Description : 인증 종료 다중 탭 cache 초기화 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   전송 fallback, 중복 제거와 cache 우선 정리 순서 검증
 */

import { describe, expect, it, vi } from "vitest";
import {
  finalizeClientAuthExit,
  publishAuthContextReset,
  subscribeToAuthContextReset,
  type AuthContextBrowser,
} from "./authContextReset";

function createBrowserHarness() {
  const channels: FakeBroadcastChannel[] = [];
  const storageListeners = new Set<(event: StorageEvent) => void>();
  const storedValues: string[] = [];

  class FakeBroadcastChannel {
    onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
    onmessageerror: (() => void) | null = null;
    postMessage = vi.fn();
    close = vi.fn();

    constructor() {
      channels.push(this);
    }
  }

  const browser: AuthContextBrowser = {
    BroadcastChannel: FakeBroadcastChannel,
    localStorage: {
      setItem: vi.fn((_key, value) => storedValues.push(value)),
      removeItem: vi.fn(),
    },
    addEventListener: (_type, listener) => storageListeners.add(listener),
    removeEventListener: (_type, listener) => storageListeners.delete(listener),
  };

  return { browser, channels, storageListeners, storedValues };
}

describe("auth context reset", () => {
  it("BroadcastChannel과 storage 양쪽으로 인증 종료를 전파한다", () => {
    const { browser, channels, storedValues } = createBrowserHarness();

    publishAuthContextReset(browser);

    expect(channels).toHaveLength(1);
    expect(channels[0].postMessage).toHaveBeenCalledOnce();
    expect(channels[0].close).toHaveBeenCalledOnce();
    expect(storedValues).toHaveLength(1);
  });

  it("두 전송 수단에서 같은 event를 받아도 다른 탭 reset을 한 번만 실행한다", () => {
    const { browser, channels, storageListeners } = createBrowserHarness();
    const onReset = vi.fn();
    const unsubscribe = subscribeToAuthContextReset(onReset, browser);
    const event = {
      type: "BOARDPORT_AUTH_CONTEXT_RESET",
      version: 1,
      eventId: "event-from-another-tab",
      sourceId: "another-tab",
    };

    channels[0].onmessage?.({ data: event } as MessageEvent<unknown>);
    for (const listener of storageListeners) {
      listener({
        key: "bp_auth_context_reset",
        newValue: JSON.stringify(event),
      } as StorageEvent);
    }

    expect(onReset).toHaveBeenCalledOnce();
    unsubscribe();
    expect(channels[0].close).toHaveBeenCalledOnce();
    expect(storageListeners.size).toBe(0);
  });

  it("현재 탭 cache를 비운 뒤 다른 탭 통지와 화면 이동을 수행한다", () => {
    const order: string[] = [];

    finalizeClientAuthExit(
      { clear: () => order.push("clear") },
      {
        replace: (href) => order.push(`replace:${href}`),
        refresh: () => order.push("refresh"),
      },
      "/login",
      () => order.push("publish")
    );

    expect(order).toEqual([
      "clear",
      "publish",
      "replace:/login",
      "refresh",
    ]);
  });
});
