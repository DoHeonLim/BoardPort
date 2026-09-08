/**
 * File Name : features/notification/utils/pwaPushWorker.test.ts
 * Description : PWA Push Service Worker 표시 보호 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.13  임도헌   Created   현재 계정 승인 성공만 알림을 표시하도록 검증
 */

import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

type WorkerListener = (event: Record<string, unknown>) => void;

const workerSource = readFileSync(
  new URL("../../../public/pwa-push.js", import.meta.url),
  "utf8"
);

const guardedPayload = {
  version: 1,
  recipientUserId: 7,
  title: "거래 알림",
  body: "새 메시지가 도착했습니다.",
  link: "/chats/3",
};

function createWorkerHarness({
  subscription = {
    toJSON: () => ({
      endpoint: "https://fcm.googleapis.com/fcm/send/current-device",
      keys: { p256dh: "device_key", auth: "auth_key" },
    }),
  },
  fetchResult = Promise.resolve({
    ok: true,
    json: async () => ({ valid: true }),
  }),
}: {
  subscription?: { toJSON: () => Record<string, unknown> } | null;
  fetchResult?: Promise<{
    ok: boolean;
    json: () => Promise<Record<string, unknown>>;
  }>;
} = {}) {
  const listeners = new Map<string, WorkerListener>();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const fetchMock = vi.fn().mockReturnValue(fetchResult);

  const workerGlobal = {
    location: { origin: "https://board-port.example" },
    registration: {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(subscription),
      },
      showNotification,
    },
    addEventListener(type: string, listener: WorkerListener) {
      listeners.set(type, listener);
    },
  };

  runInNewContext(workerSource, {
    self: workerGlobal,
    fetch: fetchMock,
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    Date,
    clients: {
      matchAll: vi.fn().mockResolvedValue([]),
      openWindow: vi.fn(),
    },
  });

  const dispatchPush = async (payload: Record<string, unknown>) => {
    let pending: Promise<unknown> | null = null;
    listeners.get("push")?.({
      data: { json: () => payload },
      waitUntil: (promise: Promise<unknown>) => {
        pending = promise;
      },
    });
    await pending;
  };

  return { dispatchPush, fetchMock, listeners, showNotification };
}

describe("pwa-push display authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("현재 세션과 기기 소유권이 승인된 Push만 표시한다", async () => {
    const { dispatchPush, fetchMock, showNotification } = createWorkerHarness();

    await dispatchPush(guardedPayload);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://board-port.example/api/auth/push-delivery",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      })
    );
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual({
      endpoint: "https://fcm.googleapis.com/fcm/send/current-device",
      keys: { p256dh: "device_key", auth: "auth_key" },
      version: 1,
      recipientUserId: 7,
    });
    expect(showNotification).toHaveBeenCalledWith(
      guardedPayload.title,
      expect.objectContaining({ body: guardedPayload.body })
    );
  });

  it.each([
    {
      label: "legacy payload",
      payload: { ...guardedPayload, version: 0 },
      subscription: undefined,
      response: undefined,
    },
    {
      label: "missing browser subscription",
      payload: guardedPayload,
      subscription: null,
      response: undefined,
    },
    {
      label: "non-2xx authorization",
      payload: guardedPayload,
      subscription: undefined,
      response: { ok: false, json: async () => ({ valid: false }) },
    },
    {
      label: "explicit denial",
      payload: guardedPayload,
      subscription: undefined,
      response: { ok: true, json: async () => ({ valid: false }) },
    },
  ])(
    "$label이면 개인정보 알림을 표시하지 않는다",
    async ({ payload, subscription, response }) => {
      const options: Parameters<typeof createWorkerHarness>[0] = {};
      if (subscription === null) options.subscription = null;
      if (response) options.fetchResult = Promise.resolve(response);
      const { dispatchPush, showNotification } = createWorkerHarness(options);

      await dispatchPush(payload);

      expect(showNotification).not.toHaveBeenCalled();
    }
  );

  it("표시 승인 네트워크가 실패하면 fail-closed 처리한다", async () => {
    const { dispatchPush, showNotification } = createWorkerHarness({
      fetchResult: Promise.reject(new Error("network unavailable")),
    });

    await dispatchPush(guardedPayload);

    expect(showNotification).not.toHaveBeenCalled();
  });

  it("Worker가 표시 보호 버전 handshake에 응답한다", () => {
    const { listeners } = createWorkerHarness();
    const postMessage = vi.fn();

    listeners.get("message")?.({
      data: { type: "BOARDPORT_PUSH_DISPLAY_GUARD_VERSION_REQUEST" },
      ports: [{ postMessage }],
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: "BOARDPORT_PUSH_DISPLAY_GUARD_VERSION_RESPONSE",
      version: 1,
    });
  });
});
