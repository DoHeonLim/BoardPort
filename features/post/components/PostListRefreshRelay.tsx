/**
 * File Name : features/post/components/PostListRefreshRelay.tsx
 * Description : 게시글 목록 back 복귀 후 stale list를 1회만 새로고침하는 릴레이
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.07  임도헌   Created   게시글 상세 삭제 후 history back 복귀 시 목록 stale 상태를 1회 refresh로 보정
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  consumeNavigationRefreshFlag,
  createNavigationRefreshFlagKey,
} from "@/lib/navigationRefreshFlag";

/**
 * 게시글 목록 복귀 후 1회 refresh 릴레이
 *
 * [기능]
 * - 상세 삭제 후 `router.back()`으로 돌아온 `/posts` 목록이 stale 상태로 남지 않도록
 *   세션 플래그를 1회 소비해 `router.refresh()`를 수행
 */
export default function PostListRefreshRelay() {
  const router = useRouter();

  useEffect(() => {
    const refreshKey = createNavigationRefreshFlagKey(
      "posts-list-refresh",
      "root"
    );

    if (!consumeNavigationRefreshFlag(refreshKey)) return;
    router.refresh();
  }, [router]);

  return null;
}
