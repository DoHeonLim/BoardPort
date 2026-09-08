/**
 * File Name : lib/navigationToast.ts
 * Description : 화면 전환 완료 후 표시할 단발성 성공 토스트 전달 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.24  임도헌   Created   App Router 전환 중 유실되지 않는 목적 경로 기반 성공 토스트 전달 추가
 */

const NAVIGATION_TOAST_STORAGE_KEY = "boardport-navigation-success-toast";
const NAVIGATION_TOAST_TTL_MS = 30_000;

export interface NavigationToastStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface PendingNavigationToast {
  message: string;
  targetPath: string;
  createdAt: number;
}

/** 브라우저 환경 또는 테스트 주입값에서 사용할 session storage를 반환한다. */
function resolveNavigationToastStorage(
  storage?: NavigationToastStorage
): NavigationToastStorage | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

/**
 * 목적 경로가 실제로 렌더링된 뒤 표시할 성공 토스트를 기록한다.
 *
 * Next.js 16 soft navigation에서는 Parallel Route의 이전 화면이 유지될 수 있어,
 * 출발 화면이나 popstate 시점에 바로 띄운 토스트가 목적 화면 commit 전에 유실될 수 있다.
 * 메시지와 목적 pathname을 같은 탭 sessionStorage에 남겨 전환 완료 후 소비한다.
 */
export function markNavigationSuccessToast(
  targetPath: string,
  message: string,
  storage?: NavigationToastStorage,
  now: number = Date.now()
) {
  const resolvedStorage = resolveNavigationToastStorage(storage);
  if (!resolvedStorage) return;

  const pendingToast: PendingNavigationToast = {
    message,
    targetPath,
    createdAt: now,
  };
  resolvedStorage.setItem(
    NAVIGATION_TOAST_STORAGE_KEY,
    JSON.stringify(pendingToast)
  );
}

/**
 * 현재 경로와 일치하는 유효한 성공 토스트를 한 번만 소비한다.
 * 목록 relay 재오픈 과정의 중간 경로에서는 보존하고 최종 목적 화면에서만 제거한다.
 */
export function consumeNavigationSuccessToast(
  pathname: string,
  storage?: NavigationToastStorage,
  now: number = Date.now()
): string | null {
  const resolvedStorage = resolveNavigationToastStorage(storage);
  if (!resolvedStorage) return null;

  const stored = resolvedStorage.getItem(NAVIGATION_TOAST_STORAGE_KEY);
  if (!stored) return null;

  try {
    const pendingToast = JSON.parse(stored) as Partial<PendingNavigationToast>;
    const isValid =
      typeof pendingToast.message === "string" &&
      typeof pendingToast.targetPath === "string" &&
      typeof pendingToast.createdAt === "number";

    if (!isValid || now - pendingToast.createdAt! > NAVIGATION_TOAST_TTL_MS) {
      resolvedStorage.removeItem(NAVIGATION_TOAST_STORAGE_KEY);
      return null;
    }

    if (pendingToast.targetPath !== pathname) return null;

    resolvedStorage.removeItem(NAVIGATION_TOAST_STORAGE_KEY);
    return pendingToast.message!;
  } catch {
    resolvedStorage.removeItem(NAVIGATION_TOAST_STORAGE_KEY);
    return null;
  }
}
