/**
 * File Name : features/notification/hooks/usePushNotification.ts
 * Description : 푸시 알림 커스텀 훅 (next-pwa 자동 등록 전제)
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

// 내부 유틸: SW 지원 여부 + ready 대기 헬퍼
function checkSupport() {
  try {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      return false;
    }

    // dev에서 next-pwa가 disable된 경우 방어
    if (process.env.NODE_ENV === "development") {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * next-pwa가 자동 등록한 sw가 없는 경우를 대비해서,
 * - 등록 상태를 한 번 조회하고
 * - 없으면 /sw.js를 직접 register 시도
 * - 그 다음 navigator.serviceWorker.ready를 타임아웃과 함께 기다린다.
 */
async function waitForServiceWorkerReady(
  label: string,
  timeoutMs = 10000
): Promise<ServiceWorkerRegistration> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("SERVICE_WORKER_NOT_SUPPORTED");
  }

  try {
    // 1) 현재 등록된 SW가 있는지 한 번 확인 (디버깅용 로그 포함)
    const existing = await navigator.serviceWorker.getRegistration();
    if (!existing) {
      console.warn(
        `[push] no existing ServiceWorker registration detected. (${label})`
      );
      // next-pwa가 알아서 등록해주는게 정상인데, 혹시라도 누락된 경우를 위해
      // /sw.js 수동 등록을 한 번 시도 (idempotent)
      try {
        await navigator.serviceWorker.register("/sw.js");
        console.info("[push] tried manual ServiceWorker.register('/sw.js').");
      } catch (e) {
        console.error("[push] manual ServiceWorker register failed:", e);
      }
    }

    // 2) ready + 타임아웃 레이스
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

// 훅 본체
export function usePushNotification() {
  const [subscription, setSubscription] = useState<PushSubscriptionData | null>(
    null
  );
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPrivateMode, setIsPrivateMode] = useState(false);

  // 로컬 상태 정리 헬퍼 (중복 방지)
  const clearLocalState = () => {
    setIsSubscribed(false);
    setSubscription(null);
  };

  // 지원 여부 초기화
  useEffect(() => {
    setIsSupported(checkSupport());
  }, []);

  // 현재 구독 상태 확인
  useEffect(() => {
    if (!isSupported) return;

    let mounted = true;
    const controller = new AbortController();

    const check = async () => {
      try {
        // Private 모드 감지
        try {
          localStorage.setItem("bp_push_probe", "1");
          localStorage.removeItem("bp_push_probe");
          if (mounted) setIsPrivateMode(false);
        } catch {
          if (mounted) {
            setIsPrivateMode(true);
            // 프라이빗 모드에서는 구독 상태를 확정할 수 없으니 로컬 상태 정리
            clearLocalState();
          }
          return;
        }

        // Service Worker 준비 대기 (ready + 필요 시 수동 register)
        const registration = await waitForServiceWorkerReady("check");
        if (!mounted) return;

        const current = await registration.pushManager.getSubscription();
        if (!mounted) return;

        if (!current) {
          // 구독이 없으면 둘 다 정리
          clearLocalState();
          return;
        }

        // 서버 검증(전역 pushEnabled까지 고려)
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
            setIsSubscribed(true);
            setSubscription(current.toJSON() as PushSubscriptionData);
            return;
          }

          // 유효하지 않으면(전역 OFF/서버 비활성 등 포함) 브라우저 구독 제거 + 상태 정리
          try {
            await current.unsubscribe();
          } catch (unsubErr) {
            // unsubscribe 실패해도 상태는 정리해야 UI/정합이 무너지지 않음
            console.warn("[push] current.unsubscribe() failed:", unsubErr);
          } finally {
            if (mounted) clearLocalState();
          }
          return;
        }

        // 서버가 200이 아니면 "유효 판정 불가" → 로컬 state는 깨끗이
        if (mounted) clearLocalState();
      } catch (e: any) {
        if (!mounted) return;
        console.error("[push] check failed:", e);

        // 예외 케이스도 로컬 state 정리 (invalid 흔적 제거)
        clearLocalState();

        if (e?.message === "SERVICE_WORKER_READY_TIMEOUT") {
          toast.error(
            "푸시 알림 초기화에 시간이 너무 오래 걸립니다. 페이지를 새로고침한 뒤 다시 시도해주세요."
          );
        }
      }
    };

    check();

    return () => {
      mounted = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported]);

  // 알림 구독 활성화
  const subscribe = async () => {
    try {
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

      const registration = await waitForServiceWorkerReady("subscribe");

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        toast.error("VAPID 공개키가 설정되지 않았습니다.");
        return;
      }

      // 기존 구독이 있으면 재사용(서버 동기화만)
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        const reused = existing.toJSON() as PushSubscriptionData;
        const resReuse = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reused),
        });
        if (!resReuse.ok) {
          throw new Error(`서버 구독 동기화 실패(${resReuse.status})`);
        }
        setSubscription(reused);
        setIsSubscribed(true);
        toast.success("푸시 알림이 활성화되었습니다. (기존 구독 재사용)");
        return;
      }

      // 새 구독 생성
      const newSub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const payload = newSub.toJSON() as PushSubscriptionData;

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        await newSub.unsubscribe().catch(() => {});
        throw new Error(`서버 구독 등록 실패(${res.status})`);
      }

      setSubscription(payload);
      setIsSubscribed(true);
      toast.success("푸시 알림이 활성화되었습니다.");
    } catch (e: any) {
      console.error("[push] subscribe failed:", e);

      if (e?.message === "SERVICE_WORKER_READY_TIMEOUT") {
        toast.error(
          "푸시 알림 초기화에 실패했습니다. 페이지를 새로고침한 뒤 다시 시도해주세요."
        );
      } else if (e?.message === "SERVICE_WORKER_NOT_SUPPORTED") {
        toast.error("이 환경에서는 서비스워커를 사용할 수 없습니다.");
      } else {
        toast.error(`푸시 알림 설정 실패: ${e?.message ?? "알 수 없는 오류"}`);
      }
    }
  };

  // 구독 해제 (전역 OFF)
  const unsubscribe = async () => {
    try {
      if (!isSupported) return;

      // 전역 OFF(서버) 먼저 처리
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});

      // 로컬 상태는 먼저 정리 (UX/정합 SSOT)
      clearLocalState();

      // 현재 브라우저 구독도 정리 (가능한 경우)
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
      if (e?.message === "SERVICE_WORKER_READY_TIMEOUT") {
        toast.error(
          "서비스워커 준비 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
        );
      } else {
        toast.error("푸시 알림 해제에 실패했습니다.");
      }
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
// utils
// ────────────────────────────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
