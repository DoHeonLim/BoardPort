"use client";

/**
 * File Name : features/product/components/ProductListRefreshRelay.tsx
 * Description : 제품 목록 back 복귀 후 mixed tree를 정리하는 refresh 릴레이
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.24  임도헌   Created   ProductModalReopenRelay에서 제품 목록 refresh 책임을 분리해 전용 relay로 신설
 */

import { useEffect } from "react";
import {
  consumeNavigationRefresh,
  NAVIGATION_REFRESH_ROOT_ID,
  NAVIGATION_REFRESH_SCOPES,
} from "@/lib/navigationRefreshFlag";

/**
 * 제품 목록 복귀 후 1회 reload 릴레이
 *
 * [기능]
 * - 상세/모달 삭제 후 `router.back()`으로 돌아온 `/products`가 stale 상태로 남지 않도록
 *   같은 탭 세션 플래그를 1회 소비해 현재 엔트리를 `window.location.reload()`로 다시 로드
 * - App Router가 back 복귀 시 이전 상세 트리를 함께 복원하는 mixed tree 예외 케이스를 강제로 정리
 */
export default function ProductListRefreshRelay() {
  // `/products` 진입 직후 세션 flag 소비 및 App Router mixed tree 강제 정리
  useEffect(() => {
    if (
      !consumeNavigationRefresh(
        NAVIGATION_REFRESH_SCOPES.PRODUCTS_LIST,
        NAVIGATION_REFRESH_ROOT_ID
      )
    ) {
      return;
    }

    window.location.reload();
  }, []);

  return null;
}
