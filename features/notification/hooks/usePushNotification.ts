/**
 * File Name : features/notification/hooks/usePushNotification.ts
 * Description : 푸시 알림 구독 관리 훅 (브라우저 API + 서버 동기화)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.20  임도헌   Created
 * 2024.12.20  임도헌   Modified  푸시 알림 커스텀 훅 추가
 * 2024.12.31  임도헌   Modified  푸시 알림 코드 리팩토링
 * 2025.11.10  임도헌   Modified  next-pwa 자동 SW 사용(수동 register 제거), 가드/토스트 보강
 * 2025.11.29  임도헌   Modified  Service Worker 준비/등록 헬퍼 추가,
 *                                READY 타임아웃/에러 메시지 보강
 * 2025.12.21  임도헌   Modified  unsubscribe 시 서버 전역 OFF 먼저 처리(푸시 정책 SSOT),
 *                                check-subscription 동기화(전역 pushEnabled 고려)
 * 2025.12.28  임도헌   Modified  invalid(isValid=false) 시 subscription state도 null로 정리,
 *                                private mode/서버 오류/예외 분기에서도 로컬 상태 정리 보강,
 *                                current.unsubscribe() best-effort 처리
 * 2026.01.16  임도헌   Moved     hooks -> hooks/notificaiton
 * 2026.01.18  임도헌   Moved     hooks/notification -> features/notification/hooks
 * 2026.03.27  임도헌   Modified  iOS 설치 필요 상태를 포함할 수 있도록 푸시 상태 타입 확장
 * 2026.04.02  임도헌   Modified  푸시 상태 타입을 notification/types 공용 정의로 분리
 * 2026.04.17  임도헌   Modified  푸시 구독 훅의 초기 점검/재연결/해제 책임이 주석에서 바로 드러나도록 설명 보강
 * 2026.04.26  임도헌   Modified  초기 자동 점검의 Service Worker ready 타임아웃을 콘솔 오류/토스트로 노출하지 않도록 완화
 * 2026.05.16  임도헌   Modified  push 에러 처리 타입을 unknown-safe 방식으로 정리
 * 2026.08.13  임도헌   Modified  구독 키 소유 증명과 계정 불일치 기기 정리 추가
 * 2026.08.13  임도헌   Modified  표시 보호 Worker 확인 후 구독하고 서버 해제 성공 뒤에만 전역 OFF 처리
 * 2026.08.23  임도헌   Modified  Serwist 자동 등록 및 수동 복구 경로 기준으로 설명 갱신
 */

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { PushNotificationStatus } from "@/features/notification/types";
import {
  PUSH_DISPLAY_GUARD_VERSION,
  probePushDisplayGuard,
  waitForPushDisplayGuard,
} from "@/features/notification/utils/pushDisplayGuard";

export type { PushNotificationStatus } from "@/features/notification/types";

interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** 브라우저 PushSubscription을 표시 보호 버전이 포함된 API DTO로 변환한다. */
function serializeGuardedSubscription(subscription: PushSubscription) {
  return {
    ...subscription.toJSON(),
    displayGuardVersion: PUSH_DISPLAY_GUARD_VERSION,
  };
}

type CheckSubscriptionResponse = {
  isValid: boolean;
  reason?:
    "active" | "disabled_by_user" | "needs_reconnect" | "account_mismatch";
};

/**
 * 브라우저 환경 지원 여부 확인
 * - Service Worker, Push API, Notification API가 모두 있어야 함
 * - 개발 모드(Development)에서는 Serwist가 비활성화될 수 있으므로 false 처리
 */
function checkSupport() {
  try {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      return false;
    }

    if (process.env.NODE_ENV === "development") {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Service Worker 준비 상태 대기 헬퍼
 *
 * 1. 현재 등록된 SW가 있는지 확인
 * 2. 없으면 수동 등록(`/sw.js`)을 시도 (Serwist 자동 등록 실패 대비)
 * 3. `navigator.serviceWorker.ready`를 타임아웃과 함께 기다림
 *
 * @param label - 로깅용 라벨 (check, subscribe 등)
 * @param timeoutMs - 대기 시간 (기본 10초)
 * @param options.logError - 사용자 액션이 아닌 초기 점검에서는 콘솔 에러를 남기지 않도록 제어
 */
async function waitForServiceWorkerReady(
  label: string,
  timeoutMs = 10000,
  options: { logError?: boolean; requirePushDisplayGuard?: boolean } = {}
): Promise<ServiceWorkerRegistration> {
  const { logError = true, requirePushDisplayGuard = false } = options;

  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("SERVICE_WORKER_NOT_SUPPORTED");
  }

  try {
    // 1. 현재 등록된 SW 확인
    const existing = await navigator.serviceWorker.getRegistration();
    if (!existing) {
      if (logError) {
        console.warn(
          `[push] no existing ServiceWorker registration detected. (${label})`
        );
      }
      // 2. 수동 등록 시도 (Idempotent)
      try {
        await navigator.serviceWorker.register("/sw.js");
        if (logError) {
          console.info("[push] tried manual ServiceWorker.register('/sw.js').");
        }
      } catch (e) {
        if (logError) {
          console.error("[push] manual ServiceWorker register failed:", e);
        }
      }
    }

    // 3. Ready 상태 대기 (Race with Timeout)
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("SERVICE_WORKER_READY_TIMEOUT")),
        timeoutMs
      )
    );

    let registration = (await Promise.race([
      readyPromise,
      timeoutPromise,
    ])) as ServiceWorkerRegistration;

    if (requirePushDisplayGuard) {
      const activeWorker = registration.active;
      const guardAlreadyReady =
        activeWorker && (await probePushDisplayGuard(activeWorker));

      if (!guardAlreadyReady) {
        // importScripts 자원까지 HTTP cache를 우회해 최신 표시 보호 Worker를
        // 설치한다. skipWaiting 뒤 registration.active가 바뀔 때까지 handshake한다.
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        await registration.update();
        await waitForPushDisplayGuard(registration, timeoutMs);
      }
    }

    return registration;
  } catch (e: unknown) {
    if (logError) {
      console.error(`[push] service worker not ready (${label}):`, e);
    }
    throw e;
  }
}

/** Service Worker 준비 대기 중 발생한 timeout 오류인지 판별한다. */
function isServiceWorkerReadyTimeout(error: unknown) {
  return (
    error instanceof Error && error.message === "SERVICE_WORKER_READY_TIMEOUT"
  );
}

/** 알 수 없는 Push 오류를 사용자에게 표시할 문자열로 정규화한다. */
function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "오류 발생";
}

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

/**
 * 브라우저 푸시 알림 구독 상태를 관리하는 훅
 *
 * [기능]
 * - 브라우저 지원 여부, private mode, 권한 상태를 초기 점검해 현재 푸시 상태를 분기
 * - Service Worker 준비와 서버 `check-subscription` 검증을 통해 `active`/`needs_reconnect`/`disabled` 상태를 동기화
 * - `subscribe`는 브라우저 구독 생성과 서버 저장을 함께 처리하고, `unsubscribe`는 서버 전역 OFF 후 로컬 구독 정리를 수행
 * - 훅 내부에서 토스트와 로컬 상태 정리를 함께 담당해 토글 UI가 단순한 상태 표현에 집중하도록 돕는다
 *
 * @returns {object} 푸시 지원/구독 상태, 현재 subscription payload, subscribe/unsubscribe 제어 함수
 */
export function usePushNotification() {
  const [subscription, setSubscription] = useState<PushSubscriptionData | null>(
    null
  );
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [status, setStatus] = useState<PushNotificationStatus>("disabled");

  // 로컬 상태 초기화 헬퍼
  const clearLocalState = () => {
    setIsSubscribed(false);
    setSubscription(null);
  };

  // 1. 지원 여부 체크 (Mount 시 1회)
  useEffect(() => {
    const supported = checkSupport();
    setIsSupported(supported);
    if (!supported) setStatus("unsupported");
  }, []);

  // 2. 현재 구독 상태 확인 (초기화 로직)
  useEffect(() => {
    if (!isSupported) return;

    let mounted = true;
    const controller = new AbortController();

    const check = async () => {
      try {
        // 2-1. Private(Incognito) 모드 감지
        // LocalStorage 접근 테스트로 판별 (일부 브라우저는 Private 모드에서 예외 발생)
        try {
          localStorage.setItem("bp_push_probe", "1");
          localStorage.removeItem("bp_push_probe");
          if (mounted) setIsPrivateMode(false);
        } catch {
          if (mounted) {
            setIsPrivateMode(true);
            setStatus("private_mode");
            clearLocalState(); // Private 모드면 사용 불가 처리
          }
          return;
        }

        if (Notification.permission === "denied") {
          if (mounted) {
            setStatus("permission_denied");
            clearLocalState();
          }
          return;
        }

        // 2-2. Service Worker 준비
        const registration = await waitForServiceWorkerReady("check", 10000, {
          logError: false,
          requirePushDisplayGuard: true,
        });
        if (!mounted) return;

        // 2-3. 브라우저의 현재 Push 구독 정보 가져오기
        const current = await registration.pushManager.getSubscription();
        if (!mounted) return;

        if (!current) {
          if (mounted) setStatus("disabled");
          clearLocalState(); // 구독 정보 없으면 초기화
          return;
        }

        // 2-4. 서버 검증 (DB와 상태 동기화)
        // 브라우저는 구독 중이라도, 서버에서 비활성화(로그아웃, 전역 OFF 등) 되었을 수 있음
        const res = await fetch("/api/push/check-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(serializeGuardedSubscription(current)),
          signal: controller.signal,
        });

        if (!mounted) return;

        if (res.ok) {
          const { isValid, reason } =
            (await res.json()) as CheckSubscriptionResponse;
          if (!mounted) return;

          if (isValid) {
            // 유효함: 상태 동기화
            setIsSubscribed(true);
            setSubscription(current.toJSON() as PushSubscriptionData);
            setStatus("active");
            return;
          }

          if (reason === "disabled_by_user" || reason === "account_mismatch") {
            // 전역 OFF 또는 이전 계정 소유 기기는 원격/로컬 상태를
            // 같이 정리해 다음 계정으로 알림이 노출되는 것을 막는다.
            try {
              await current.unsubscribe();
            } catch (unsubErr) {
              console.warn("[push] current.unsubscribe() failed:", unsubErr);
            } finally {
              if (mounted) {
                setStatus("disabled");
                clearLocalState();
              }
            }
            return;
          }

          if (reason === "needs_reconnect") {
            // 브라우저에는 구독이 남아 있지만 서버/원격 상태와 끊어진 경우.
            // 로컬 구독을 지우지 않고 재연결 액션을 유도
            if (mounted) {
              setSubscription(current.toJSON() as PushSubscriptionData);
              setIsSubscribed(false);
              setStatus("needs_reconnect");
            }
            return;
          }

          if (mounted) {
            setStatus("disabled");
            clearLocalState();
          }
          return;
        }

        // 서버 에러 시 보수적으로 로컬 상태 초기화
        if (mounted) {
          setStatus("disabled");
          clearLocalState();
        }
      } catch (e: unknown) {
        if (!mounted) return;
        const readyTimeout = isServiceWorkerReadyTimeout(e);
        if (!readyTimeout) {
          console.error("[push] check failed:", e);
        }
        clearLocalState();
        setStatus(
          Notification.permission === "denied"
            ? "permission_denied"
            : "disabled"
        );
      }
    };

    check();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [isSupported]);

  /**
   * 알림 구독 활성화 (Subscribe)
   * 1. 지원 여부, 프라이빗 모드, 온라인 상태 등 사전 검사
   * 2. 브라우저 알림 권한 요청 (requestPermission)
   * 3. PushManager.subscribe()로 브라우저 구독 생성
   * 4. 서버 API로 구독 정보 전송 및 저장
   */
  const subscribe = async () => {
    try {
      // 1. 사전 검사
      if (!isSupported) {
        toast.error("이 브라우저는 푸시 알림을 지원하지 않습니다.");
        return;
      }
      if (isPrivateMode) {
        toast.error("프라이빗 모드에서는 푸시 알림을 사용할 수 없습니다.");
        return;
      }
      if (!navigator.onLine) {
        toast.error("오프라인 상태입니다. 인터넷 연결 후 다시 시도해주세요.");
        return;
      }

      // 2. 권한 요청
      if (Notification.permission === "denied") {
        setStatus("permission_denied");
        toast.error(
          "브라우저 알림 권한이 차단되어 있습니다. 사이트 권한을 허용해주세요."
        );
        return;
      }

      if (status === "needs_reconnect") {
        toast.info("이 기기의 알림 연결을 다시 확인하고 있어요.");
      } else {
        toast.info(
          "푸시 알림을 활성화하면 새 메시지/거래 알림을 받을 수 있어요."
        );
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "permission_denied" : "disabled");
        toast.error(
          "알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요."
        );
        return;
      }

      // 3. 브라우저 구독 생성
      const registration = await waitForServiceWorkerReady("subscribe", 10000, {
        requirePushDisplayGuard: true,
      });
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        toast.error("VAPID 공개키 설정 오류");
        return;
      }

      const handleOwnershipConflict = async (current: PushSubscription) => {
        // DB 소유 키와 현재 브라우저 키가 다르면 임의로
        // 덮어쓰지 않고 로컬 구독을 폐기한다. 다음 시도는
        // PushManager가 새 소유 키/endpoint를 발급하도록 유도한다.
        try {
          await current.unsubscribe();
        } catch (cleanupError) {
          console.warn(
            "[push] conflicting local subscription cleanup failed:",
            cleanupError
          );
        }

        clearLocalState();
        setStatus("needs_reconnect");
        toast.error(
          "기존 알림 연결을 새로 설정해야 합니다. 다시 한 번 시도해주세요."
        );
      };

      // 기존 구독 재사용 시도
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        const reused = existing.toJSON() as PushSubscriptionData;
        // 서버에 재전송하여 활성 상태 갱신
        const resReuse = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(serializeGuardedSubscription(existing)),
        });
        if (resReuse.status === 409) {
          await handleOwnershipConflict(existing);
          return;
        }
        if (!resReuse.ok) {
          throw new Error(`서버 동기화 실패(${resReuse.status})`);
        }
        setSubscription(reused);
        setIsSubscribed(true);
        setStatus("active");
        toast.success(
          status === "needs_reconnect"
            ? "기기 알림 연결이 다시 설정되었습니다."
            : "푸시 알림이 활성화되었습니다."
        );
        return;
      }

      // 신규 구독
      const newSub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const payload = newSub.toJSON() as PushSubscriptionData;

      // 4. 서버 저장
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serializeGuardedSubscription(newSub)),
      });

      if (!res.ok) {
        if (res.status === 409) {
          await handleOwnershipConflict(newSub);
          return;
        }

        // 서버 저장 실패 시 브라우저 구독도 롤백
        await newSub.unsubscribe().catch(() => {});
        throw new Error(`서버 등록 실패(${res.status})`);
      }

      setSubscription(payload);
      setIsSubscribed(true);
      setStatus("active");
      toast.success(
        status === "needs_reconnect"
          ? "기기 알림 연결이 다시 설정되었습니다."
          : "푸시 알림이 활성화되었습니다."
      );
    } catch (e: unknown) {
      console.error("[push] subscribe failed:", e);
      if (isServiceWorkerReadyTimeout(e)) {
        toast.error("초기화 실패. 새로고침 후 다시 시도해주세요.");
      } else {
        toast.error(`푸시 알림 설정 실패: ${getErrorMessage(e)}`);
      }
    }
  };

  /**
   * 알림 구독 해제 (Unsubscribe)
   * 1. 서버 API를 호출하여 전역 설정을 OFF로 변경
   * 2. 로컬 상태 초기화
   * 3. 브라우저의 PushManager 구독 해제 (Best Effort)
   */
  const unsubscribe = async () => {
    try {
      if (!isSupported) return;

      // 1. 서버 전역 OFF
      const response = await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      // 서버가 모든 기기의 구독과 재검증 자격을 실제로 끈 뒤에만
      // 이 브라우저를 성공 상태로 전환한다.
      if (!response.ok) {
        throw new Error(`서버 구독 해제 실패(${response.status})`);
      }

      // 2. 로컬 상태 정리 (UX 우선)
      setStatus("disabled");
      clearLocalState();

      // 3. 브라우저 구독 해제
      try {
        const registration = await waitForServiceWorkerReady("unsubscribe");
        const current = await registration.pushManager.getSubscription();
        if (current) await current.unsubscribe();
      } catch (cleanupErr) {
        console.warn("[push] local unsubscribe cleanup failed:", cleanupErr);
      }

      toast.success("푸시 알림이 비활성화되었습니다.");
    } catch (e: unknown) {
      console.error("[push] unsubscribe failed:", e);
      toast.error("푸시 알림 해제 중 오류가 발생했습니다.");
    }
  };

  return {
    isSupported,
    isSubscribed,
    isPrivateMode,
    status,
    subscription,
    subscribe,
    unsubscribe,
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// Utils
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Base64 문자열을 Uint8Array로 변환 (VAPID Key 변환용)
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
