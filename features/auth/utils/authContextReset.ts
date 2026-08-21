/**
 * File Name : features/auth/utils/authContextReset.ts
 * Description : 인증 종료 시 현재 탭과 다른 탭의 사용자 Query cache 초기화
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   로그아웃·탈퇴의 다중 탭 cache 초기화와 이동 순서 통합
 */

const AUTH_CONTEXT_CHANNEL = "boardport-auth-context";
const AUTH_CONTEXT_STORAGE_KEY = "bp_auth_context_reset";
const AUTH_CONTEXT_EVENT_TYPE = "BOARDPORT_AUTH_CONTEXT_RESET";
const AUTH_CONTEXT_EVENT_VERSION = 1;

type AuthContextResetEvent = {
  type: typeof AUTH_CONTEXT_EVENT_TYPE;
  version: typeof AUTH_CONTEXT_EVENT_VERSION;
  eventId: string;
  sourceId: string;
};

type BroadcastChannelLike = {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onmessageerror: (() => void) | null;
  postMessage: (message: unknown) => void;
  close: () => void;
};

export type AuthContextBrowser = {
  BroadcastChannel?: new (name: string) => BroadcastChannelLike;
  localStorage?: Pick<Storage, "setItem" | "removeItem">;
  addEventListener: (
    type: "storage",
    listener: (event: StorageEvent) => void
  ) => void;
  removeEventListener: (
    type: "storage",
    listener: (event: StorageEvent) => void
  ) => void;
};

type QueryCacheBoundary = { clear: () => void };
type AuthExitNavigation = {
  replace: (href: string) => void;
  refresh: () => void;
};

const sourceId = `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function getBrowser(): AuthContextBrowser | null {
  return typeof window === "undefined"
    ? null
    : (window as unknown as AuthContextBrowser);
}

function isAuthContextResetEvent(value: unknown): value is AuthContextResetEvent {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const event = value as Record<string, unknown>;
  return (
    event.type === AUTH_CONTEXT_EVENT_TYPE &&
    event.version === AUTH_CONTEXT_EVENT_VERSION &&
    typeof event.eventId === "string" &&
    event.eventId.length > 0 &&
    typeof event.sourceId === "string" &&
    event.sourceId.length > 0
  );
}

function createResetEvent(): AuthContextResetEvent {
  return {
    type: AUTH_CONTEXT_EVENT_TYPE,
    version: AUTH_CONTEXT_EVENT_VERSION,
    eventId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sourceId,
  };
}

/** 로그아웃·탈퇴 완료 사실을 같은 origin의 다른 탭에 전달한다. */
export function publishAuthContextReset(
  browser: AuthContextBrowser | null = getBrowser()
) {
  if (!browser) return;

  const event = createResetEvent();

  // BroadcastChannel과 storage를 함께 사용한다. 특정 탭에서 한 전송 수단의
  // 생성이 실패해도 다른 탭이 인증 종료 신호를 받을 수 있게 하기 위함이다.
  try {
    if (browser.BroadcastChannel) {
      const channel = new browser.BroadcastChannel(AUTH_CONTEXT_CHANNEL);
      channel.postMessage(event);
      channel.close();
    }
  } catch {
    // storage fallback을 계속 시도한다.
  }

  try {
    const serialized = JSON.stringify(event);
    browser.localStorage?.setItem(AUTH_CONTEXT_STORAGE_KEY, serialized);
    browser.localStorage?.removeItem(AUTH_CONTEXT_STORAGE_KEY);
  } catch {
    // 현재 탭의 cache 정리는 별도로 완료되므로 탭 간 알림 실패는 fail-soft다.
  }
}

/** 다른 탭에서 발생한 인증 종료 신호를 구독한다. */
export function subscribeToAuthContextReset(
  onReset: () => void,
  browser: AuthContextBrowser | null = getBrowser()
) {
  if (!browser) return () => {};

  let channel: BroadcastChannelLike | null = null;
  let lastHandledEventId: string | null = null;

  const handleEvent = (value: unknown) => {
    if (!isAuthContextResetEvent(value)) return;
    if (value.sourceId === sourceId || value.eventId === lastHandledEventId) {
      return;
    }

    // 같은 event를 BroadcastChannel과 storage 양쪽에서 받아도 한 번만 처리한다.
    lastHandledEventId = value.eventId;
    onReset();
  };

  try {
    if (browser.BroadcastChannel) {
      channel = new browser.BroadcastChannel(AUTH_CONTEXT_CHANNEL);
      channel.onmessage = (event) => handleEvent(event.data);
      channel.onmessageerror = () => {};
    }
  } catch {
    channel = null;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== AUTH_CONTEXT_STORAGE_KEY || !event.newValue) return;

    try {
      handleEvent(JSON.parse(event.newValue));
    } catch {
      // 다른 코드가 쓴 손상된 storage 값은 인증 상태 변경으로 취급하지 않는다.
    }
  };

  browser.addEventListener("storage", handleStorage);

  return () => {
    browser.removeEventListener("storage", handleStorage);
    channel?.close();
  };
}

/** 현재 탭 cache 정리 → 다른 탭 통지 → 이동 순서를 공통으로 보장한다. */
export function finalizeClientAuthExit(
  queryCache: QueryCacheBoundary,
  navigation: AuthExitNavigation,
  redirectTo = "/",
  notifyOtherTabs: () => void = publishAuthContextReset
) {
  queryCache.clear();
  notifyOtherTabs();
  navigation.replace(redirectTo);
  navigation.refresh();
}
