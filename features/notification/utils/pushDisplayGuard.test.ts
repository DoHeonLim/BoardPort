/**
 * File Name : features/notification/utils/pushDisplayGuard.test.ts
 * Description : Push 표시 보호 Service Worker 버전 확인 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.13  임도헌   Created   구 Worker 거부와 새 Worker 활성화 대기 검증
 */

import { describe, expect, it } from "vitest";
import {
  probePushDisplayGuard,
  PUSH_DISPLAY_GUARD_VERSION,
  PUSH_DISPLAY_GUARD_VERSION_REQUEST,
  PUSH_DISPLAY_GUARD_VERSION_RESPONSE,
  waitForPushDisplayGuard,
} from "./pushDisplayGuard";

function createWorker(version: number | null): ServiceWorker {
  return {
    postMessage(message: unknown, transfer: Transferable[]) {
      if (
        version === null ||
        (message as { type?: string }).type !==
          PUSH_DISPLAY_GUARD_VERSION_REQUEST
      ) {
        return;
      }

      const responsePort = transfer[0] as MessagePort;
      responsePort.postMessage({
        type: PUSH_DISPLAY_GUARD_VERSION_RESPONSE,
        version,
      });
    },
  } as unknown as ServiceWorker;
}

describe("Push display guard Service Worker handshake", () => {
  it("현재 표시 보호 버전을 응답하는 Worker만 승인한다", async () => {
    await expect(
      probePushDisplayGuard(createWorker(PUSH_DISPLAY_GUARD_VERSION), 50)
    ).resolves.toBe(true);
    await expect(probePushDisplayGuard(createWorker(0), 50)).resolves.toBe(
      false
    );
  });

  it("응답하지 않는 구 Worker를 fail-closed로 거부한다", async () => {
    await expect(probePushDisplayGuard(createWorker(null), 10)).resolves.toBe(
      false
    );
  });

  it("registration.active가 새 Worker로 교체될 때까지 기다린다", async () => {
    const registration = {
      active: createWorker(null),
    } as unknown as ServiceWorkerRegistration;

    setTimeout(() => {
      Object.defineProperty(registration, "active", {
        configurable: true,
        value: createWorker(PUSH_DISPLAY_GUARD_VERSION),
      });
    }, 15);

    await expect(waitForPushDisplayGuard(registration, 250)).resolves.toBe(
      undefined
    );
  });

  it("제한 시간 안에 보호 Worker가 활성화되지 않으면 실패한다", async () => {
    const registration = {
      active: createWorker(null),
    } as unknown as ServiceWorkerRegistration;

    await expect(waitForPushDisplayGuard(registration, 20)).rejects.toThrow(
      "PUSH_DISPLAY_GUARD_NOT_READY"
    );
  });
});
