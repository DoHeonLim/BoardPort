/**
 * File Name : features/post/components/PostListRefreshRelay.tsx
 * Description : 게시글 목록 back 복귀 후 stale list를 1회만 새로고침하는 릴레이
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.07  임도헌   Created   게시글 상세 삭제 후 history back 복귀 시 목록 stale 상태를 1회 refresh로 보정
 * 2026.04.24  임도헌   Modified  같은 탭 sessionStorage 기반 router.refresh 트리거라는 역할이 드러나도록 주석 보강
 * 2026.04.24  임도헌   Modified  navigation refresh helper로 목록 refresh flag 소비 로직을 단순화
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  consumeNavigationRefresh,
  NAVIGATION_REFRESH_ROOT_ID,
  NAVIGATION_REFRESH_SCOPES,
} from "@/lib/navigationRefreshFlag";

/**
 * 게시글 목록 복귀 후 1회 refresh 릴레이
 *
 * [기능]
 * - 상세 삭제 후 `router.back()`으로 돌아온 게시글 목록이 stale 상태로 남지 않도록
 *   같은 탭 세션 플래그를 1회 소비해 `router.refresh()`를 수행
 */
export default function PostListRefreshRelay() {
  const router = useRouter();

  useEffect(() => {
    if (
      !consumeNavigationRefresh(
        NAVIGATION_REFRESH_SCOPES.POSTS_LIST,
        NAVIGATION_REFRESH_ROOT_ID
      )
    ) {
      return;
    }
    router.refresh();
  }, [router]);

  return null;
}
