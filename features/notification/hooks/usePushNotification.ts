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
 */

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * 브라우저 환경 지원 여부 확인
 * - Service Worker, Push API, Notification API가 모두 있어야 합니다.
 * - 개발 모드(Development)에서는 next-pwa가 비활성화될 수 있으므로 false 처리합니다.
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
 * 1. 현재 등록된 SW가 있는지 확인합니다.
 * 2. 없으면 수동 등록(`/sw.js`)을 시도합니다. (next-pwa 자동 등록 실패 대비)
 * 3. `navigator.serviceWorker.ready`를 타임아웃과 함께 기다립니다.
 *
 * @param label - 로깅용 라벨 (check, subscribe 등)
 * @param timeoutMs - 대기 시간 (기본 10초)
 */
async function waitForServiceWorkerReady(
  label: string,
  timeoutMs = 10000
): Promise<ServiceWorkerRegistration> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("SERVICE_WORKER_NOT_SUPPORTED");
  }

  try {
    // 1. 현재 등록된 SW 확인
    const existing = await navigator.serviceWorker.getRegistration();
    if (!existing) {
      console.warn(
        `[push] no existing ServiceWorker registration detected. (${label})`
      );
      // 2. 수동 등록 시도 (Idempotent)
      try {
        await navigator.serviceWorker.register("/sw.js");
        console.info("[push] tried manual ServiceWorker.register('/sw.js').");
      } catch (e) {
        console.error("[push] manual ServiceWorker register failed:", e);
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

    const registration = (await Promise.race([
      readyPromise,
      timeoutPromise,
    ])) as ServiceWorkerRegistration;

    return registration;
  } catch (e: any) {
    console.error(`[push] service worker not ready (${label}):`, e);
    throw e;
  }
}

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

export function usePushNotification() {
  const [subscription, setSubscription] = useState<PushSubscriptionData | null>(
    null
  );
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPrivateMode, setIsPrivateMode] = useState(false);

  // 로컬 상태 초기화 헬퍼
  const clearLocalState = () => {
    setIsSubscribed(false);
    setSubscription(null);
  };

  // 1. 지원 여부 체크 (Mount 시 1회)
  useEffect(() => {
    setIsSupported(checkSupport());
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
            clearLocalState(); // Private 모드면 사용 불가 처리
          }
          return;
        }

        // 2-2. Service Worker 준비
        const registration = await waitForServiceWorkerReady("check");
        if (!mounted) return;

        // 2-3. 브라우저의 현재 Push 구독 정보 가져오기
        const current = await registration.pushManager.getSubscription();
        if (!mounted) return;

        if (!current) {
          clearLocalState(); // 구독 정보 없으면 초기화
          return;
        }

        // 2-4. 서버 검증 (DB와 상태 동기화)
        // 브라우저는 구독 중이라도, 서버에서 비활성화(로그아웃, 전역 OFF 등) 되었을 수 있음
        const res = await fetch("/api/push/check-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: current.endpoint }),
          signal: controller.signal,
        });

        if (!mounted) return;

        if (res.ok) {
          const { isValid } = await res.json();
          if (!mounted) return;

          if (isValid) {
            // 유효함: 상태 동기화
            setIsSubscribed(true);
            setSubscription(current.toJSON() as PushSubscriptionData);
            return;
          }

          // 유효하지 않음: 브라우저 구독도 해제하여 상태 일치
          try {
            await current.unsubscribe();
          } catch (unsubErr) {
            console.warn("[push] current.unsubscribe() failed:", unsubErr);
          } finally {
            if (mounted) clearLocalState();
          }
          return;
        }

        // 서버 에러 시 보수적으로 로컬 상태 초기화
        if (mounted) clearLocalState();
      } catch (e: any) {
        if (!mounted) return;
        console.error("[push] check failed:", e);
        clearLocalState();

        if (e?.message === "SERVICE_WORKER_READY_TIMEOUT") {
          toast.error("푸시 알림 초기화 지연. 새로고침 후 다시 시도해주세요.");
        }
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

      toast.info(
        "푸시 알림을 활성화하면 새 메시지/거래 알림을 받을 수 있어요."
      );

      // 2. 권한 요청
      if (Notification.permission === "denied") {
        toast.error(
          "브라우저 알림 권한이 차단되어 있습니다. 사이트 권한을 허용해주세요."
        );
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error(
          "알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요."
        );
        return;
      }

      // 3. 브라우저 구독 생성
      const registration = await waitForServiceWorkerReady("subscribe");
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        toast.error("VAPID 공개키 설정 오류");
        return;
      }

      // 기존 구독 재사용 시도
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        const reused = existing.toJSON() as PushSubscriptionData;
        // 서버에 재전송하여 활성 상태 갱신
        const resReuse = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reused),
        });
        if (!resReuse.ok) {
          throw new Error(`서버 동기화 실패(${resReuse.status})`);
        }
        setSubscription(reused);
        setIsSubscribed(true);
        toast.success("푸시 알림이 활성화되었습니다.");
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
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // 서버 저장 실패 시 브라우저 구독도 롤백
        await newSub.unsubscribe().catch(() => {});
        throw new Error(`서버 등록 실패(${res.status})`);
      }

      setSubscription(payload);
      setIsSubscribed(true);
      toast.success("푸시 알림이 활성화되었습니다.");
    } catch (e: any) {
      console.error("[push] subscribe failed:", e);
      if (e?.message === "SERVICE_WORKER_READY_TIMEOUT") {
        toast.error("초기화 실패. 새로고침 후 다시 시도해주세요.");
      } else {
        toast.error(`푸시 알림 설정 실패: ${e?.message ?? "오류 발생"}`);
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
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});

      // 2. 로컬 상태 정리 (UX 우선)
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
    } catch (e: any) {
      console.error("[push] unsubscribe failed:", e);
      toast.error("푸시 알림 해제 중 오류가 발생했습니다.");
    }
  };

  return {
    isSupported,
    isSubscribed,
    isPrivateMode,
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
