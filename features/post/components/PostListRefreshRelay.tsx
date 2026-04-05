"use client";

/**
 * File Name : features/post/components/PostListRefreshRelay.tsx
 * Description : 게시글 목록 1회 refresh 릴레이
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.18  임도헌   Created   detail-edit 삭제 후 back 복귀한 게시글 목록은 세션 refresh 플래그를 1회만 소비해 stale list를 방지
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  consumeNavigationRefreshFlag,
  createNavigationRefreshFlagKey,
} from "@/lib/navigationRefreshFlag";

/**
 * 게시글 목록 복귀 직후 1회 refresh 릴레이
 *
 * [필요 이유]
 * - detail-edit 삭제는 replace 대신 back 복귀를 사용해 히스토리를 자연스럽게 유지
 * - 다만 back 직후 목록은 App Router 캐시와 하이드레이션된 이전 데이터가 잠깐 남을 수 있음
 * - 그래서 세션 플래그가 있는 경우에만 목록을 1회 refresh해 삭제 직후 stale list를 정리
 */
export default function PostListRefreshRelay() {
  const router = useRouter();

  useEffect(() => {
    const refreshKey = createNavigationRefreshFlagKey(
      "posts-list-refresh",
      "root"
    );
    // history는 back으로 유지하고, 데이터 freshness만 1회 보강
    if (!consumeNavigationRefreshFlag(refreshKey)) return;
    router.refresh();
  }, [router]);

  return null;
}
