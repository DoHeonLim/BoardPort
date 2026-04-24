/**
 * File Name : features/stream/components/RecordingListRefreshRelay.tsx
 * Description : 녹화 목록/채널/프로필 back 복귀 후 stale list를 1회만 새로고침하는 릴레이
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.07  임도헌   Created   녹화 상세 삭제 후 returnTo 대상 목록으로 back 복귀할 때 stale 상태를 1회 refresh로 보정
 * 2026.04.24  임도헌   Modified  현재 정규화 경로와 같은 탭 sessionStorage 기반 router.refresh 트리거라는 설명으로 주석 보강
 * 2026.04.24  임도헌   Modified  내 프로필 방송국 복귀도 같은 녹화 목록 refresh relay로 처리
 * 2026.04.24  임도헌   Modified  navigation refresh helper로 녹화 목록 refresh flag 소비 로직을 단순화
 */
"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import {
  consumeNavigationRefresh,
  NAVIGATION_REFRESH_SCOPES,
} from "@/lib/navigationRefreshFlag";

/**
 * 녹화 목록/채널/프로필 복귀 후 1회 refresh 릴레이
 *
 * [기능]
 * - 삭제 후 `router.back()`으로 돌아온 returnTo 대상 화면이 stale 상태로 남지 않도록
 *   현재 정규화 경로를 키로 같은 탭 세션 플래그를 1회 소비해 `router.refresh()`를 수행
 */
export default function RecordingListRefreshRelay() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // 삭제 직전에 기록한 returnTo와 동일한 형태로 맞춰 sessionStorage flag key 매칭
  const currentHref = useMemo(
    () =>
      sanitizeCallbackUrl(
        sp?.size ? `${pathname}?${sp.toString()}` : pathname
      ),
    [pathname, sp]
  );

  // 녹화 삭제 후 돌아온 목록/프로필/채널 화면에서만 서버 payload 1회 재요청
  useEffect(() => {
    // 같은 탭에서 방금 생성된 단발성 flag만 소비해 새 탭/직접 진입 영향 차단
    if (
      !consumeNavigationRefresh(
        NAVIGATION_REFRESH_SCOPES.RECORDING_LIST,
        currentHref
      )
    ) {
      return;
    }
    router.refresh();
  }, [currentHref, router]);

  return null;
}
