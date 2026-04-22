/**
 * File Name : features/stream/components/RecordingListRefreshRelay.tsx
 * Description : 녹화 목록/채널 back 복귀 후 stale list를 1회만 새로고침하는 릴레이
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.07  임도헌   Created   녹화 상세 삭제 후 returnTo 대상 목록으로 back 복귀할 때 stale 상태를 1회 refresh로 보정
 */
"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import {
  consumeNavigationRefreshFlag,
  createNavigationRefreshFlagKey,
} from "@/lib/navigationRefreshFlag";

/**
 * 녹화 목록/채널 복귀 후 1회 refresh 릴레이
 *
 * [기능]
 * - 삭제 후 `router.back()`으로 돌아온 returnTo 대상 화면이 stale 상태로 남지 않도록
 *   현재 경로를 키로 세션 플래그를 1회 소비해 `router.refresh()`를 수행
 */
export default function RecordingListRefreshRelay() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const currentHref = useMemo(
    () =>
      sanitizeCallbackUrl(
        sp?.size ? `${pathname}?${sp.toString()}` : pathname
      ),
    [pathname, sp]
  );

  useEffect(() => {
    const refreshKey = createNavigationRefreshFlagKey(
      "recording-list-refresh",
      currentHref
    );

    if (!consumeNavigationRefreshFlag(refreshKey)) return;
    router.refresh();
  }, [currentHref, router]);

  return null;
}
