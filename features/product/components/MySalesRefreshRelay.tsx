"use client";

/**
 * File Name : features/product/components/MySalesRefreshRelay.tsx
 * Description : 내 판매 목록 back 복귀 후 mixed tree를 정리하는 refresh 릴레이
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.24  임도헌   Created   상세 삭제/숨김 후 내 판매 목록 back 복귀 시 현재 엔트리를 1회 reload하는 relay 추가
 * 2026.04.24  임도헌   Modified  navigation refresh helper로 my-sales refresh flag 소비 로직을 단순화
 */

import { useEffect } from "react";
import {
  consumeNavigationRefresh,
  NAVIGATION_REFRESH_ROOT_ID,
  NAVIGATION_REFRESH_SCOPES,
} from "@/lib/navigationRefreshFlag";

/**
 * 내 판매 목록 복귀 후 1회 refresh 릴레이
 *
 * [기능]
 * - 상세 삭제/숨김 상태 변경 후 `router.back()`으로 돌아온 `/profile/my-sales`가 stale 상태로 남지 않도록
 *   같은 탭 세션 플래그를 1회 소비해 현재 엔트리를 `window.location.reload()`로 다시 로드
 * - App Router가 back 복귀 시 이전 상세 트리를 함께 복원하는 예외 케이스를 강제로 정리
 */
export default function MySalesRefreshRelay() {
  // `/profile/my-sales` 복귀 직후 세션 flag 소비 및 상세 트리 잔상 제거
  useEffect(() => {
    if (
      !consumeNavigationRefresh(
        NAVIGATION_REFRESH_SCOPES.MY_SALES,
        NAVIGATION_REFRESH_ROOT_ID
      )
    ) {
      return;
    }
    window.location.reload();
  }, []);

  return null;
}
